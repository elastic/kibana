/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import execa from 'execa';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { ElasticsearchConfig } from './read_kibana_config';

const OTEL_DEMO_REPO_URL = 'https://github.com/open-telemetry/opentelemetry-demo.git';
const OTEL_DEMO_REPOSITORY = 'open-telemetry/opentelemetry-demo';
const SCS_DOCKER_IMAGE = 'ghcr.io/elastic/semantic-code-search:main';

// Cached outside the Kibana repo so it persists across branches and is never committed.
const SCS_CACHE_DIR = path.join(os.homedir(), '.kbn-otel-scs');
// Tracks which version is currently indexed so --version changes trigger a re-index.
const INDEXED_VERSION_FILE = path.join(SCS_CACHE_DIR, '.indexed-version');

interface SeedCodeSearchOptions {
  elasticsearch: ElasticsearchConfig;
  kibanaCredentials: { username: string; password: string };
  kibanaUrl: string;
  version: string;
  log: ToolingLog;
}

type ScsMode = 'path' | 'docker';

/**
 * Returns whether to use the PATH-installed `scs` binary or the Docker image.
 * Prefers PATH; falls back to pulling the published Docker image (no build step).
 */
async function ensureScs(log: ToolingLog): Promise<ScsMode> {
  try {
    await execa.command('scs --version');
    log.info('Using scs from PATH.');
    return 'path';
  } catch {
    // not on PATH — fall through to Docker
  }

  log.info(`Pulling SCS Docker image (${SCS_DOCKER_IMAGE}) ...`);
  await execa('docker', ['pull', SCS_DOCKER_IMAGE], { stdio: 'inherit' });
  return 'docker';
}

/**
 * Replaces localhost/127.0.0.1 with host.docker.internal so that URLs
 * passed to a Docker container can reach the host's services.
 */
const toDockerHost = (s: string) =>
  s.replace(/\b(localhost|127\.0\.0\.1)\b/g, 'host.docker.internal');

/**
 * Runs an scs subcommand using either the PATH-installed binary or the Docker image.
 * When mode is 'docker' and repoDir is provided, it is mounted read-only at /repo
 * inside the container and scs args referencing the repo must use /repo.
 */
async function runScs(
  mode: ScsMode,
  scsArgs: string[],
  env: NodeJS.ProcessEnv,
  repoDir?: string
): Promise<void> {
  if (mode === 'path') {
    await execa('scs', scsArgs, { stdio: 'inherit', env });
    return;
  }

  // Rewrite localhost references in env values and CLI args so the container
  // can reach host-side services (Elasticsearch, Kibana).
  const dockerEnv: NodeJS.ProcessEnv = {};
  for (const [k, v] of Object.entries(env)) {
    dockerEnv[k] = typeof v === 'string' ? toDockerHost(v) : v;
  }
  const dockerArgs = scsArgs.map(toDockerHost);

  await execa(
    'docker',
    [
      'run',
      '--rm',
      // Allow the container to reach host services via host.docker.internal on Linux.
      ...(process.platform === 'linux' ? ['--add-host', 'host.docker.internal:host-gateway'] : []),
      ...(repoDir ? ['-v', `${repoDir}:/repo:ro`] : []),
      ...Object.entries(dockerEnv)
        .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
        .flatMap(([k, v]) => ['-e', `${k}=${v}`]),
      SCS_DOCKER_IMAGE,
      'scs',
      ...dockerArgs,
    ],
    { stdio: 'inherit' }
  );
}

/**
 * Returns a local path to the OTel demo repo checked out at the given tag.
 * Cached per-version under SCS_CACHE_DIR so repeated runs skip the clone.
 */
async function ensureOtelDemoAtVersion(version: string, log: ToolingLog): Promise<string> {
  const repoDir = path.join(SCS_CACHE_DIR, 'repos', `opentelemetry-demo-${version}`);
  if (fs.existsSync(repoDir)) {
    log.info(`Using cached OTel demo source at ${repoDir}`);
    return repoDir;
  }
  log.info(`Cloning OTel demo at tag v${version} to ${repoDir} ...`);
  await execa(
    'git',
    ['clone', '--depth', '1', '--branch', `v${version}`, OTEL_DEMO_REPO_URL, repoDir],
    { stdio: 'inherit' }
  );
  return repoDir;
}

function getIndexedVersion(): string | null {
  try {
    return fs.readFileSync(INDEXED_VERSION_FILE, 'utf-8').trim() || null;
  } catch {
    return null;
  }
}

function setIndexedVersion(version: string): void {
  fs.mkdirSync(SCS_CACHE_DIR, { recursive: true });
  fs.writeFileSync(INDEXED_VERSION_FILE, version);
}

async function chunksIndexHasDocs(esHosts: string, username: string, password: string) {
  try {
    const res = await fetch(`${esHosts}/code-open-telemetry_opentelemetry-demo_chunks/_count`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
      },
    });
    if (!res.ok) return false;
    const body = (await res.json()) as { count?: number };
    return (body.count ?? 0) > 0;
  } catch {
    return false;
  }
}

export async function seedCodeSearch({
  elasticsearch,
  kibanaCredentials,
  kibanaUrl,
  version,
  log,
}: SeedCodeSearchOptions) {
  const [scsMode, repoDir] = await Promise.all([
    ensureScs(log),
    ensureOtelDemoAtVersion(version, log),
  ]);

  // scs reads ES credentials from environment variables
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    ELASTICSEARCH_ENDPOINT: elasticsearch.hosts,
    ELASTICSEARCH_USERNAME: elasticsearch.username,
    ELASTICSEARCH_PASSWORD: elasticsearch.password,
    // Use the ELSER 2 inference endpoint that ships with Elastic Stack
    SCS_ELASTICSEARCH_INFERENCE_ID: '.elser-2-elasticsearch',
  };

  // Skip re-index only when the same version is already indexed.
  // If --version changes, force a clean re-index so indexed source matches the deployed demo.
  const indexedVersion = getIndexedVersion();
  const hasDocs = await chunksIndexHasDocs(
    elasticsearch.hosts,
    elasticsearch.username,
    elasticsearch.password
  );

  if (indexedVersion === version && hasDocs) {
    log.info(`Existing code index found for v${version} — skipping re-index.`);
  } else {
    if (indexedVersion && indexedVersion !== version) {
      log.info(`Version changed (${indexedVersion} → ${version}) — re-indexing with --clean.`);
    } else {
      log.info(
        `No existing code index for v${version} — indexing with --clean. May take several minutes.`
      );
    }

    // In Docker mode the repo is mounted at /repo; in path mode pass the local path directly.
    const repoDirArg = scsMode === 'docker' ? '/repo' : repoDir;
    await runScs(
      scsMode,
      ['index', repoDirArg, '--clean', '--repository', OTEL_DEMO_REPOSITORY],
      env,
      scsMode === 'docker' ? repoDir : undefined
    );

    setIndexedVersion(version);
    log.info('Code indexing complete.');
  }

  log.info('Installing agentic interfaces into Kibana ...');

  await runScs(
    scsMode,
    [
      'install-agentic-interfaces',
      '--kibana-url',
      kibanaUrl,
      '--username',
      kibanaCredentials.username,
      '--password',
      kibanaCredentials.password,
    ],
    env
  );

  log.info('Agentic interfaces installed.');
}
