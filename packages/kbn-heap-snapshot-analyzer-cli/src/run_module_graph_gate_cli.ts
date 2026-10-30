/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// CI gate for the Kibana server's runtime module graph. Boots Elasticsearch
// and a dev Kibana with the require-graph preload (HEAP_TRACK_REQUIRE_ONLY=1,
// no allocation tracking), waits until the server reports available, dumps the
// require graph via SIGUSR1, and fails if any banned browser-only or
// GenAI-stack module was loaded during startup.
//
// This is a runtime check on purpose: lint rules and static import walks
// cannot see dynamic imports that execute during startup, while the require
// graph records exactly what the server process loaded.
//
// Usage:
//   node scripts/check_server_module_graph [flags]
//
//   --es-port <n>                Elasticsearch port (default 9221)
//   --kibana-port <n>            Kibana port (default 5611)
//   --elasticsearch-url <url>    Use an already-running Elasticsearch instead
//                                of booting one (expects changeme credentials)
//   --settle-seconds <n>         Idle time after "available" before the dump
//                                (default 15)
//   --startup-timeout-seconds <n> Max wait for Kibana availability (default 900)
//   --keep-dump                  Keep the dump file and print its path

import { spawn, type ChildProcess } from 'child_process';
import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { getHeapTrackPreloadPath } from './preload_path';

interface BannedPackage {
  /** Human-readable name used in reports. */
  label: string;
  /** Matches a loaded module's absolute path. */
  pattern: RegExp;
  /** Regex source passed to require_cache_analyzer --chains on failure. */
  chainPattern: string;
}

/**
 * Packages that must never be loaded by the Kibana server at startup.
 * Zero tolerance: there is no allowlist. `react`, `react-dom` and `@emotion/*`
 * are deliberately absent — core's rendering service legitimately renders the
 * bootstrap template with React on the server.
 */
export const BANNED_SERVER_MODULES: BannedPackage[] = [
  // Browser-only UI stack
  {
    label: '@elastic/eui',
    pattern: /node_modules\/@elastic\/eui\//,
    chainPattern: '@elastic/eui/',
  },
  { label: 'refractor', pattern: /node_modules\/refractor\//, chainPattern: 'refractor/' },
  { label: 'prismjs', pattern: /node_modules\/prismjs\//, chainPattern: 'prismjs/' },
  {
    label: '@elastic/apm-rum',
    pattern: /node_modules\/@elastic\/apm-rum/,
    chainPattern: '@elastic/apm-rum',
  },
  { label: 'react-intl', pattern: /node_modules\/react-intl\//, chainPattern: 'react-intl/' },
  { label: 'react-use', pattern: /node_modules\/react-use\//, chainPattern: 'react-use/' },
  { label: 'react-redux', pattern: /node_modules\/react-redux\//, chainPattern: 'react-redux/' },
  { label: 'redux', pattern: /node_modules\/redux\//, chainPattern: '/redux/' },
  { label: '@reduxjs', pattern: /node_modules\/@reduxjs\//, chainPattern: '@reduxjs/' },
  // GenAI stack
  { label: '@langchain', pattern: /node_modules\/@langchain\//, chainPattern: '@langchain/' },
  { label: 'langsmith', pattern: /node_modules\/langsmith\//, chainPattern: 'langsmith/' },
  { label: 'openai', pattern: /node_modules\/openai\//, chainPattern: 'node_modules/openai/' },
  {
    label: 'gpt-tokenizer',
    pattern: /node_modules\/gpt-tokenizer\//,
    chainPattern: 'gpt-tokenizer/',
  },
  { label: 'js-tiktoken', pattern: /node_modules\/js-tiktoken\//, chainPattern: 'js-tiktoken/' },
  {
    label: '@modelcontextprotocol',
    pattern: /node_modules\/@modelcontextprotocol\//,
    chainPattern: '@modelcontextprotocol/',
  },
  {
    label: 'google-auth-library',
    pattern: /node_modules\/google-auth-library\//,
    chainPattern: 'google-auth-library/',
  },
  {
    label: 'zod-to-json-schema',
    pattern: /node_modules\/zod-to-json-schema\//,
    chainPattern: 'zod-to-json-schema/',
  },
];

/** Count banned modules in a require-graph dump. Exported for tests. */
export function findBannedModules(
  dumpLines: string[],
  banned: BannedPackage[] = BANNED_SERVER_MODULES
): { total: number; counts: Map<string, number> } {
  const counts = new Map<string, number>();
  let total = 0;

  for (const line of dumpLines) {
    if (!line.trim()) continue;
    const { id } = JSON.parse(line) as { id: string };
    total++;
    for (const ban of banned) {
      if (ban.pattern.test(id)) {
        counts.set(ban.label, (counts.get(ban.label) ?? 0) + 1);
      }
    }
  }

  return { total, counts };
}

/**
 * For each banned package, the modules OUTSIDE the banned set that import into
 * it — the exact import sites that need a fix. Exported for tests.
 */
export function findBannedEntryEdges(
  dumpLines: string[],
  banned: BannedPackage[] = BANNED_SERVER_MODULES
): Map<string, Set<string>> {
  const isBanned = (id: string) => banned.some((ban) => ban.pattern.test(id));
  const edges = new Map<string, Set<string>>();

  for (const line of dumpLines) {
    if (!line.trim()) continue;
    const { id, parents } = JSON.parse(line) as { id: string; parents?: string[] };
    for (const ban of banned) {
      if (!ban.pattern.test(id)) continue;
      for (const parent of parents ?? []) {
        if (isBanned(parent)) continue;
        let set = edges.get(ban.label);
        if (!set) {
          set = new Set();
          edges.set(ban.label, set);
        }
        set.add(parent);
      }
    }
  }

  return edges;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function runServerModuleGraphGateCli(): Promise<void> {
  const argv = process.argv.slice(2);
  const flagValue = (name: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const esPort = Number(flagValue('es-port') ?? 9221);
  const kibanaPort = Number(flagValue('kibana-port') ?? 5611);
  const externalEsUrl = flagValue('elasticsearch-url');
  const settleSeconds = Number(flagValue('settle-seconds') ?? 15);
  const startupTimeoutSeconds = Number(flagValue('startup-timeout-seconds') ?? 900);
  const keepDump = argv.includes('--keep-dump');

  const workDir = mkdtempSync(join(tmpdir(), 'kbn-module-graph-gate-'));
  const dumpPath = join(workDir, 'require-graph.jsonl');
  const esUrl = externalEsUrl ?? `http://localhost:${esPort}`;

  const children: ChildProcess[] = [];
  const killAll = () => {
    for (const child of children) {
      if (child.pid && child.exitCode === null) {
        try {
          process.kill(-child.pid, 'SIGKILL');
        } catch {
          // already gone
        }
      }
    }
  };
  process.on('SIGINT', () => {
    killAll();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    killAll();
    process.exit(143);
  });

  const log = (msg: string) => process.stdout.write(`[module-graph-gate] ${msg}\n`);

  try {
    if (!externalEsUrl) {
      log(`starting Elasticsearch on :${esPort}`);
      const es = spawn(
        process.execPath,
        [
          'scripts/es',
          'snapshot',
          '--license',
          'trial',
          '-E',
          `http.port=${esPort}`,
          '-E',
          `transport.port=${esPort + 1}`,
          '--base-path',
          join(workDir, 'es'),
        ],
        { cwd: REPO_ROOT, detached: true, stdio: ['ignore', 'pipe', 'pipe'] }
      );
      children.push(es);
      es.stdout?.resume();
      es.stderr?.resume();

      const esDeadline = Date.now() + startupTimeoutSeconds * 1000;
      for (;;) {
        if (es.exitCode !== null) {
          throw new Error(`Elasticsearch exited with code ${es.exitCode} before becoming ready`);
        }
        try {
          const res = await fetch(`${esUrl}/_cluster/health`, {
            headers: {
              authorization: `Basic ${Buffer.from('elastic:changeme').toString('base64')}`,
            },
          });
          if (res.ok) break;
        } catch {
          // not up yet
        }
        if (Date.now() > esDeadline) throw new Error('timed out waiting for Elasticsearch');
        await sleep(2000);
      }
      log('Elasticsearch ready');
    }

    log(`starting Kibana on :${kibanaPort} with the require-graph preload`);
    const kibana = spawn(
      process.execPath,
      [
        'scripts/kibana',
        '--dev',
        '--no-base-path',
        '--no-watch',
        '--no-optimizer',
        '--port',
        String(kibanaPort),
        `--elasticsearch.hosts=${esUrl}`,
      ],
      {
        cwd: REPO_ROOT,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_OPTIONS: `--require ${getHeapTrackPreloadPath()}`,
          HEAP_TRACK_REQUIRE_ONLY: '1',
          HEAP_TRACK_DIR: workDir,
          REQUIRE_CACHE_OUTPUT: dumpPath,
        },
      }
    );
    children.push(kibana);

    let output = '';
    let serverPid: number | undefined;
    const onChunk = (chunk: Buffer) => {
      output += chunk.toString();
      if (!serverPid) {
        const match = output.match(/\[heap-track\] require-only mode \(PID (\d+)\)/);
        if (match) serverPid = Number(match[1]);
      }
    };
    kibana.stdout?.on('data', onChunk);
    kibana.stderr?.on('data', onChunk);

    const kbnDeadline = Date.now() + startupTimeoutSeconds * 1000;
    while (!output.includes('Kibana is now available')) {
      if (kibana.exitCode !== null) {
        process.stderr.write(output.slice(-5000));
        throw new Error(`Kibana exited with code ${kibana.exitCode} before becoming available`);
      }
      if (output.includes('FATAL')) {
        process.stderr.write(output.slice(-5000));
        throw new Error('Kibana logged a FATAL error during startup');
      }
      if (Date.now() > kbnDeadline) throw new Error('timed out waiting for Kibana availability');
      await sleep(2000);
    }
    if (!serverPid) throw new Error('preload did not report the server PID — is NODE_OPTIONS set?');
    log(`Kibana available (server PID ${serverPid}); settling for ${settleSeconds}s`);
    await sleep(settleSeconds * 1000);

    process.kill(serverPid, 'SIGUSR1');
    const dumpDeadline = Date.now() + 120_000;
    while (!output.includes('require graph dumped')) {
      if (Date.now() > dumpDeadline) throw new Error('timed out waiting for the require dump');
      await sleep(1000);
    }

    const dumpLines = readFileSync(dumpPath, 'utf8').split('\n');
    const { total, counts } = findBannedModules(dumpLines);

    killAll();

    if (counts.size === 0) {
      log(`OK — ${total} modules loaded at startup, none from the banned set`);
      if (keepDump) {
        log(`dump kept at ${dumpPath}`);
      } else {
        rmSync(workDir, { recursive: true, force: true });
      }
      return;
    }

    log(`FAILED — banned modules loaded by the server at startup (${total} total modules):`);
    for (const [label, count] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
      log(`  ${String(count).padStart(5)}  ${label}`);
    }
    log('modules importing into each banned package (the import sites to fix):');
    const entryEdges = findBannedEntryEdges(dumpLines);
    for (const [label] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
      log(`  ${label}:`);
      const parents = [...(entryEdges.get(label) ?? [])].sort();
      for (const parent of parents.slice(0, 10)) {
        log(`    ${parent.startsWith(REPO_ROOT) ? parent.slice(REPO_ROOT.length + 1) : parent}`);
      }
      if (parents.length > 10) {
        log(`    … and ${parents.length - 10} more`);
      }
    }
    const firstPattern = BANNED_SERVER_MODULES.find((b) => counts.has(b.label))!.chainPattern;
    log(
      `full import chains: node scripts/require_cache_analyzer ${dumpPath} --chains '${firstPattern}'`
    );
    log(`dump kept for inspection: ${dumpPath}`);
    process.exitCode = 1;
  } finally {
    killAll();
  }
}
