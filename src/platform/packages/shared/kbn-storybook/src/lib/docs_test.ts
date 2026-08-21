/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync, spawn, type ChildProcess } from 'child_process';
import { createReadStream, existsSync, statSync } from 'fs';
import { createServer, type ServerResponse } from 'http';
import { delimiter, dirname, extname, join, resolve, sep } from 'path';
import {
  buildDocsArchive,
  buildDocsAssets,
  buildDocsRegistry,
  watchInlineRegistryBundle,
} from './docs_assets';
import type {
  BuildDocsArchiveResult,
  StorybookDocsManifest,
  WatchInlineRegistryBundleResult,
} from './docs_assets';
import { buildStorybook } from './run_storybook_cli';
import { ASSET_DIR, DOCS_ASSET_DIR, REPO_ROOT } from './constants';

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

interface StorybookDocsTestLog {
  info(message: string): void;
  error(message: string): void;
}

export interface RunStorybookDocsTestServerOptions {
  alias: string;
  configDir: string;
  port: number;
  baseUrl: string;
  skipStorybookBuild?: boolean;
  includeAllStories?: boolean;
  /** Rebuild the inline registry bundle on story-code changes while serving. Defaults to `false`. */
  watch?: boolean;
  /** Force a fresh static Storybook build even when its output already exists. Defaults to `false`. */
  rebuildStorybook?: boolean;
  /** Also start `docs-builder serve` when a colocated docset is found and the binary is installed. Defaults to `true`. */
  serveDocs?: boolean;
  /** Explicit docset directory to serve, overriding auto-detection from the alias config. */
  docsPath?: string;
  /** Port passed to `docs-builder serve`. Defaults to docs-builder's own default. */
  docsPort?: number;
  log: StorybookDocsTestLog;
}

export interface BuildStorybookDocsArtifactsOptions {
  alias: string;
  configDir: string;
  baseUrl: string;
  skipStorybookBuild?: boolean;
  includeAllStories?: boolean;
  writeArchive?: boolean;
  /** Compile the inline registry bundle. Set `false` to defer to a watcher. Defaults to `true`. */
  buildInlineBundle?: boolean;
  /** Skip the static Storybook build when its output already exists (existing-story edits don't need it). Defaults to `false`. */
  reuseStorybookIfBuilt?: boolean;
  log: StorybookDocsTestLog;
}

export interface BuildStorybookDocsArtifactsResult {
  archive?: BuildDocsArchiveResult;
  assetDir: string;
  registryUrl: string;
  manifest: StorybookDocsManifest;
}

const mimeTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const getGitValue = (args: string[]): string => {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
  } catch {
    return 'local';
  }
};

const sendNotFound = (response: ServerResponse) => {
  response.writeHead(404, corsHeaders({ 'Content-Type': 'text/plain; charset=utf-8' }));
  response.end('Not found');
};

const corsHeaders = (headers: Record<string, string> = {}) => ({
  ...headers,
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Origin': '*',
});

const isSubPath = (root: string, filePath: string): boolean =>
  filePath === root || filePath.startsWith(`${root}${sep}`);

const DOCSET_FILES = ['docset.yml', '_docset.yml'] as const;

const hasDocset = (dir: string): boolean =>
  DOCSET_FILES.some((file) => existsSync(join(dir, file)));

// Walk up from an alias's Storybook config toward the repo root, returning the nearest
// directory that holds a docset.yml. Returns undefined when no docset lives on that path,
// which is the case for docsets kept outside the package tree, such as `docs-dev`; those
// need `--docs-path`.
const findDocsetDir = (startDir: string): string | undefined => {
  let dir = resolve(startDir);
  for (;;) {
    if (hasDocset(dir)) {
      return dir;
    }
    if (dir === REPO_ROOT) {
      return undefined;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      return undefined;
    }
    dir = parent;
  }
};

// docs-builder is an external binary installed out-of-band (ela.st/docs-builder-install).
// Probe PATH for it rather than executing it, so detection stays side-effect free.
const isDocsBuilderInstalled = (): boolean => {
  const extensions = process.platform === 'win32' ? ['.exe', '.cmd', '.bat', ''] : [''];
  return (process.env.PATH ?? '')
    .split(delimiter)
    .filter(Boolean)
    .some((entry) =>
      extensions.some((ext) => {
        try {
          return statSync(join(entry, `docs-builder${ext}`)).isFile();
        } catch {
          return false;
        }
      })
    );
};

const startDocsBuilder = ({
  docsetDir,
  registryUrl,
  port,
  log,
}: {
  docsetDir: string;
  registryUrl: string;
  port?: number;
  log: StorybookDocsTestLog;
}): ChildProcess => {
  // Run from inside the docset directory: a docset nested more than one level below the git
  // root otherwise trips docs-builder's disjoint-scope-roots check. `--path .` is still
  // required because discovery starting at the git root prefers the public `docs/docset.yml`.
  const args = ['serve', '--path', '.', ...(port ? ['--port', String(port)] : [])];
  log.info(`Starting docs-builder in ${docsetDir} with KIBANA_STORYBOOK_REGISTRY=${registryUrl}`);
  const child = spawn('docs-builder', args, {
    cwd: docsetDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, KIBANA_STORYBOOK_REGISTRY: registryUrl },
  });
  child.on('error', (error) => log.info(`docs-builder failed to start: ${error.message}`));
  child.on('exit', (code, signal) =>
    log.info(`docs-builder exited (${signal ?? code ?? 'unknown'})`)
  );
  const stop = () => {
    if (!child.killed) {
      child.kill('SIGINT');
    }
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  process.once('exit', stop);
  return child;
};

// Watches the alias's inline registry bundle and rebuilds it on story-code changes. Awaits the
// first compile so the asset server starts with a ready registry.js. The docs page must be
// refreshed manually after a rebuild: docs-builder only live-reloads on docset markdown changes.
const startRegistryWatch = async ({
  alias,
  log,
}: {
  alias: string;
  log: StorybookDocsTestLog;
}): Promise<WatchInlineRegistryBundleResult> => {
  const docsDir = join(DOCS_ASSET_DIR, alias);
  const entryPath = join(docsDir, 'registry_entry.js');

  log.info(`Watching [${alias}] story sources; rebuilding the inline registry bundle on change.`);
  const watcher = watchInlineRegistryBundle({
    entryPath,
    docsDir,
    onRebuild: (error) => {
      if (error) {
        log.error(`Registry bundle rebuild failed:\n${error.message}`);
        return;
      }
      log.info('Rebuilt inline registry bundle — refresh the docs page to see changes.');
    },
  });

  const stop = () => watcher.watching.close(() => {});
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  process.once('exit', stop);

  try {
    await watcher.firstBuild;
  } catch (error) {
    log.error(`Initial registry bundle build failed:\n${(error as Error).message}`);
  }

  return watcher;
};

// Resolves the docset to hand docs-builder: an explicit --docs-path (validated) or the
// nearest docset.yml above the alias config. Returns undefined (with a hint) when none applies.
const resolveDocsetDir = ({
  alias,
  configDir,
  docsPath,
  log,
}: {
  alias: string;
  configDir: string;
  docsPath?: string;
  log: StorybookDocsTestLog;
}): string | undefined => {
  if (docsPath) {
    const candidate = resolve(REPO_ROOT, docsPath);
    if (hasDocset(candidate)) {
      return candidate;
    }
    log.info(`No docset.yml found in --docs-path [${candidate}]; skipping docs-builder.`);
    return undefined;
  }

  const docsetDir = findDocsetDir(resolve(REPO_ROOT, configDir));
  if (!docsetDir) {
    log.info(
      `No docset.yml found near [${alias}]; skipping docs-builder. Pass --docs-path <dir> to serve a specific docset, or --no-docs to silence this.`
    );
  }
  return docsetDir;
};

const serveDirectory = async ({
  directory,
  port,
  registryUrl,
  log,
  onListening,
}: {
  directory: string;
  port: number;
  registryUrl: string;
  log: StorybookDocsTestLog;
  onListening?: () => void;
}): Promise<void> => {
  const root = resolve(directory);

  await new Promise<void>((resolvePromise, reject) => {
    const server = createServer((request, response) => {
      if (request.method === 'OPTIONS') {
        response.writeHead(204, corsHeaders());
        response.end();
        return;
      }

      if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.writeHead(405, corsHeaders({ Allow: 'GET, HEAD, OPTIONS' }));
        response.end();
        return;
      }

      let pathname: string;
      try {
        pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1').pathname);
      } catch {
        sendNotFound(response);
        return;
      }
      const requestedPath = resolve(root, pathname.replace(/^\/+/, ''));

      if (!isSubPath(root, requestedPath)) {
        sendNotFound(response);
        return;
      }

      let filePath = requestedPath;

      try {
        const stats = statSync(filePath);
        if (stats.isDirectory()) {
          filePath = join(filePath, 'index.html');
        }
      } catch {
        sendNotFound(response);
        return;
      }

      try {
        const stats = statSync(filePath);
        if (!stats.isFile()) {
          sendNotFound(response);
          return;
        }

        response.writeHead(
          200,
          corsHeaders({
            'Content-Length': String(stats.size),
            'Content-Type': mimeTypes[extname(filePath)] ?? 'application/octet-stream',
          })
        );

        if (request.method === 'HEAD') {
          response.end();
          return;
        }

        createReadStream(filePath).pipe(response);
      } catch {
        sendNotFound(response);
      }
    });

    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => {
      log.info(`Serving Storybook docs assets at http://127.0.0.1:${port}`);
      log.info(`Registry URL: ${registryUrl}`);
      onListening?.();
    });

    const shutdown = () => {
      server.close(() => resolvePromise());
    };

    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  });
};

export const buildStorybookDocsArtifacts = async ({
  alias,
  configDir,
  baseUrl,
  skipStorybookBuild,
  includeAllStories,
  writeArchive = true,
  buildInlineBundle = true,
  reuseStorybookIfBuilt = false,
  log,
}: BuildStorybookDocsArtifactsOptions): Promise<BuildStorybookDocsArtifactsResult> => {
  const storybookDir = join(ASSET_DIR, alias);
  const root = trimTrailingSlash(baseUrl);
  // The static Storybook site (shared deps + iframe fallback) and the docs assets are served from
  // sibling subpaths so their URL contracts stay independent.
  const iframeBaseUrl = `${root}/storybook`;
  const inlineBaseUrl = `${root}/storybook-docs`;
  const registryUrl = `${inlineBaseUrl}/docs_registry.json`;

  // The static build only supplies index.json (the story list) and runtime assets (shared deps,
  // iframe fallback). Existing-story code edits are recompiled by the registry-bundle watcher, so
  // once a build exists it can be reused.
  const hasExistingStorybook = existsSync(join(storybookDir, 'index.json'));
  if (skipStorybookBuild || (reuseStorybookIfBuilt && hasExistingStorybook)) {
    if (!skipStorybookBuild) {
      log.info(
        `Reusing existing static Storybook build for [${alias}] (pass --rebuild-storybook for a fresh build).`
      );
    }
  } else {
    log.info(`Building static Storybook for [${alias}]`);
    process.env.STORYBOOK_BASE_URL = iframeBaseUrl;
    await buildStorybook({ configDir, name: alias, site: true });
  }

  log.info(`Generating inline Storybook docs assets for [${alias}]`);
  const manifest = await buildDocsAssets({
    alias,
    storybookDir,
    docsOutputDir: DOCS_ASSET_DIR,
    inlineBaseUrl,
    iframeBaseUrl,
    renderMode: 'inline',
    configDir,
    buildInlineBundle,
    filter: {
      includeAllStories,
    },
  });

  await buildDocsRegistry({
    aliases: [alias],
    docsRootDir: DOCS_ASSET_DIR,
    baseUrl: inlineBaseUrl,
    build: {
      commit: getGitValue(['rev-parse', 'HEAD']),
      branch: getGitValue(['branch', '--show-current']),
    },
  });
  let archive: BuildDocsArchiveResult | undefined;

  if (writeArchive) {
    const archivePath = resolve(
      DOCS_ASSET_DIR,
      '..',
      `storybook-docs-${alias}-${getGitValue(['rev-parse', '--short', 'HEAD'])}.tar.gz`
    );

    archive = await buildDocsArchive({
      aliases: manifest.stories.length > 0 ? [alias] : [],
      docsRootDir: DOCS_ASSET_DIR,
      outputPath: archivePath,
    });
  }

  return {
    archive,
    assetDir: resolve(DOCS_ASSET_DIR),
    registryUrl,
    manifest,
  };
};

export const runStorybookDocsTestServer = async ({
  alias,
  configDir,
  port,
  baseUrl,
  skipStorybookBuild,
  includeAllStories,
  watch = false,
  rebuildStorybook = false,
  serveDocs = true,
  docsPath,
  docsPort,
  log,
}: RunStorybookDocsTestServerOptions): Promise<void> => {
  const { registryUrl, manifest } = await buildStorybookDocsArtifacts({
    alias,
    configDir,
    baseUrl,
    skipStorybookBuild,
    includeAllStories,
    // The dev server never packages a tarball; that's what --dist is for. When watching, the
    // watcher owns the first (and every) registry-bundle compile, so skip the one-shot build.
    writeArchive: false,
    buildInlineBundle: !watch,
    // Reuse a prior static build across dev runs; the watcher handles existing-story edits.
    reuseStorybookIfBuilt: !rebuildStorybook,
    log,
  });

  log.info(`Docs-builder docset.yml snippet:
storybook:
  registry: ${registryUrl}`);
  log.info(`Markdown smoke test:
:::{storybook}
:id: kibana:${alias}:${manifest.stories[0]?.docsId ?? '<docsId>'}
:::`);

  if (watch && manifest.stories.length > 0) {
    await startRegistryWatch({ alias, log });
  } else if (watch) {
    log.info(`No embeddable stories for [${alias}]; nothing to watch.`);
  }

  await serveDirectory({
    directory: resolve(ASSET_DIR, '..'),
    port,
    registryUrl,
    log,
    onListening: () => {
      if (!serveDocs) {
        return;
      }
      const docsetDir = resolveDocsetDir({ alias, configDir, docsPath, log });
      if (!docsetDir) {
        return;
      }
      if (!isDocsBuilderInstalled()) {
        log.info(
          'docs-builder was not found on PATH; skipping live docs preview. Install it with: curl -sL https://ela.st/docs-builder-install | sh'
        );
        return;
      }
      startDocsBuilder({ docsetDir, registryUrl, port: docsPort, log });
    },
  });
};
