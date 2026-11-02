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
import { REPO_ROOT } from '@kbn/repo-info';
import type { ElasticsearchConfig } from './read_kibana_config';
import { applyCodeScenario } from './apply_code_scenario';
import { getCodeScenarioById } from './code_scenarios';
import { ensureOtelDemoAtVersion, OTEL_DEMO_REPOSITORY, SCS_CACHE_DIR } from './otel_demo_source';

const SCS_DOCKER_IMAGE = 'ghcr.io/elastic/semantic-code-search:main';
// scs stores its config (Elasticsearch connection, inference endpoint, etc.) here.
const SCS_CONFIG_DIR = path.join(os.homedir(), '.scs');
const SCS_DOCKER_ENV_VARS = [
  'ELASTICSEARCH_ENDPOINT',
  'ELASTICSEARCH_USERNAME',
  'ELASTICSEARCH_PASSWORD',
  'SCS_ELASTICSEARCH_INFERENCE_ID',
];

// Tracks which version is currently indexed so --version changes trigger a re-index.
const INDEXED_VERSION_FILE = path.join(SCS_CACHE_DIR, '.indexed-version');
const CODE_SCENARIO_STATE_PATH = path.join(
  REPO_ROOT,
  'data',
  'demo_environments',
  'code_scenario_state.json'
);

interface SeedCodeSearchOptions {
  elasticsearch: ElasticsearchConfig;
  kibanaCredentials: { username: string; password: string };
  kibanaUrl: string;
  version: string;
  log: ToolingLog;
  codeScenarioId?: string;
  codeScenarioRepoDir?: string;
}

interface CodeScenarioState {
  activeCodeScenarioId?: string;
}

interface ScsRunner {
  run(args: string[], env: NodeJS.ProcessEnv): Promise<void>;
  /** Rewrites a `localhost`/`127.0.0.1` URL so it's reachable from inside the scs container. */
  rewriteHostUrl(url: string): string;
}

function rewriteToDockerHost(url: string): string {
  const parsed = new URL(url);
  if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
    parsed.hostname = 'host.docker.internal';
  }
  return parsed.toString().replace(/\/$/, '');
}

/**
 * Resolves how to invoke the scs CLI. Prefers a PATH-installed `scs`; otherwise
 * falls back to the published Docker image so users don't have to clone and
 * build the semantic-code-search monorepo locally.
 */
async function resolveScsRunner(log: ToolingLog): Promise<ScsRunner> {
  try {
    await execa.command('scs --version');
    log.info('Using scs from PATH.');
    return {
      run: async (args, env) => {
        await execa('scs', args, { stdio: 'inherit', env });
      },
      rewriteHostUrl: (url) => url,
    };
  } catch {
    // not on PATH — fall back to the Docker image
  }

  log.info(`Using scs via Docker image ${SCS_DOCKER_IMAGE}`);
  // The image reads/writes its config here (e.g. from its `setup` wizard);
  // we always pass explicit args and env vars below, so the wizard never runs.
  fs.mkdirSync(SCS_CONFIG_DIR, { recursive: true });

  return {
    run: async (args, env) => {
      await execa(
        'docker',
        [
          'run',
          '--rm',
          '--add-host',
          'host.docker.internal:host-gateway',
          '-v',
          `${SCS_CONFIG_DIR}:/config`,
          // Mounted at the same path so repo paths resolve identically inside the container.
          '-v',
          `${SCS_CACHE_DIR}:${SCS_CACHE_DIR}`,
          ...SCS_DOCKER_ENV_VARS.flatMap((name) => ['-e', name]),
          SCS_DOCKER_IMAGE,
          ...args,
        ],
        { stdio: 'inherit', env }
      );
    },
    rewriteHostUrl: rewriteToDockerHost,
  };
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

async function readCodeScenarioState(): Promise<CodeScenarioState> {
  try {
    const state = await fs.promises.readFile(CODE_SCENARIO_STATE_PATH, 'utf8');
    return JSON.parse(state) as CodeScenarioState;
  } catch {
    return {};
  }
}

async function writeCodeScenarioState(state: CodeScenarioState): Promise<void> {
  await fs.promises.mkdir(path.dirname(CODE_SCENARIO_STATE_PATH), { recursive: true });
  await fs.promises.writeFile(
    CODE_SCENARIO_STATE_PATH,
    `${JSON.stringify(state, null, 2)}\n`,
    'utf8'
  );
}

export async function seedCodeSearch({
  elasticsearch,
  kibanaCredentials,
  kibanaUrl,
  version,
  log,
  codeScenarioId,
  codeScenarioRepoDir,
}: SeedCodeSearchOptions) {
  const scs = await resolveScsRunner(log);
  let repoDir: string;
  let forceReindex = false;

  if (codeScenarioId) {
    const scenario = getCodeScenarioById(codeScenarioId);
    if (!scenario) {
      throw new Error(`Unknown code scenario: ${codeScenarioId}`);
    }
    repoDir = codeScenarioRepoDir || (await applyCodeScenario({ version, scenario, log }));
    forceReindex = true;
  } else {
    repoDir = await ensureOtelDemoAtVersion(version, log);
    const previousState = await readCodeScenarioState();
    forceReindex = Boolean(previousState.activeCodeScenarioId);
  }

  // scs reads ES credentials from environment variables
  const env = {
    ...process.env,
    ELASTICSEARCH_ENDPOINT: scs.rewriteHostUrl(elasticsearch.hosts),
    ELASTICSEARCH_USERNAME: elasticsearch.username,
    ELASTICSEARCH_PASSWORD: elasticsearch.password,
    // Use the ELSER 2 inference endpoint that ships with Elastic Stack
    SCS_ELASTICSEARCH_INFERENCE_ID: '.elser-2-elasticsearch',
  };

  // Skip re-index only when the same version is already indexed and no re-index is forced
  // (a code scenario is requested, or one was previously active and must be reset).
  // If --version changes, force a clean re-index so indexed source matches the deployed demo.
  const indexedVersion = getIndexedVersion();
  const hasDocs = await chunksIndexHasDocs(
    elasticsearch.hosts,
    elasticsearch.username,
    elasticsearch.password
  );

  if (!forceReindex && indexedVersion === version && hasDocs) {
    log.info(`Existing code index found for v${version} — skipping re-index.`);
  } else {
    if (codeScenarioId) {
      log.info(
        `Indexing OTel demo v${version} with code scenario ${codeScenarioId} (--clean). May take several minutes.`
      );
    } else if (forceReindex) {
      log.info(
        `Re-indexing clean OTel demo v${version} after code scenario reset (--clean). May take several minutes.`
      );
    } else if (indexedVersion && indexedVersion !== version) {
      log.info(`Version changed (${indexedVersion} → ${version}) — re-indexing with --clean.`);
    } else {
      log.info(
        `No existing code index for v${version} — indexing with --clean. May take several minutes.`
      );
    }

    await scs.run(['index', repoDir, '--clean', '--repository', OTEL_DEMO_REPOSITORY], env);

    setIndexedVersion(version);
    log.info('Code indexing complete.');
  }

  log.info('Installing agentic interfaces into Kibana ...');

  await scs.run(
    [
      'install-agentic-interfaces',
      '--kibana-url',
      scs.rewriteHostUrl(kibanaUrl),
      '--username',
      kibanaCredentials.username,
      '--password',
      kibanaCredentials.password,
    ],
    env
  );

  log.info('Agentic interfaces installed.');
  await writeCodeScenarioState({ activeCodeScenarioId: codeScenarioId });
}
