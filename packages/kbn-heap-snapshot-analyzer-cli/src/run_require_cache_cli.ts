/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Inspect a require.cache dump produced by `kill -SIGUSR1 <kibana-pid>` (with
// the heap_track_preload installed). Answers "is module X loaded?" and "what
// chain of requires reached it?" deterministically — no static-analysis
// guesswork.
//
// Usage:
//   node scripts/require_cache_analyzer.js <dump.jsonl> [flags] [pattern...]
//
//   <dump.jsonl>            JSONL file written by SIGUSR1
//   pattern...              One or more regex patterns to match module ids.
//                           Defaults to listing top packages by module count.
//
//   --chains                For each match, print the full parent chain back
//                           to the root (entry script).
//   --limit=N               Cap matches printed (default 20).
//   --short                 Strip the kibana/build prefix to keep paths terse.

import { readFileSync } from 'fs';
import { resolve } from 'path';

interface ModuleEntry {
  id: string;
  parents: string[];
}

// Names of flags that take a value, so `--name <value>` (space-separated form)
// consumes the next arg instead of leaking it into positional patterns.
const VALUE_FLAGS = new Set(['limit']);

export function runRequireCacheAnalyzerCli(): void {
  const args = process.argv.slice(2);
  const positional: string[] = [];
  const flagValues = new Map<string, string>();
  const flagBools = new Set<string>();

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith('--')) {
      positional.push(a);
      continue;
    }
    const eq = a.indexOf('=');
    if (eq !== -1) {
      flagValues.set(a.slice(2, eq), a.slice(eq + 1));
      continue;
    }
    const name = a.slice(2);
    if (VALUE_FLAGS.has(name)) {
      const next = args[i + 1];
      if (next === undefined || next.startsWith('--')) {
        process.stderr.write(`Error: --${name} requires a value\n`);
        process.exit(1);
      }
      flagValues.set(name, next);
      i++;
      continue;
    }
    flagBools.add(name);
  }

  function flagValue(name: string): string | undefined {
    return flagValues.get(name);
  }
  function flagBool(name: string): boolean {
    return flagBools.has(name);
  }

  if (positional.length === 0) {
    process.stderr.write(
      'Usage: node scripts/require_cache_analyzer.js <dump.jsonl> [flags] [pattern...]\n' +
        '\n' +
        'Flags:\n' +
        '  --chains       Print parent chain for each match (back to entry).\n' +
        '  --limit=N      Cap matches printed (default 20).\n' +
        '  --short        Strip the build prefix for shorter output.\n' +
        '\n' +
        'With no pattern, lists top packages by module count.\n'
    );
    process.exit(1);
  }

  const dumpPath = resolve(positional[0]);
  const patterns = positional.slice(1).map((p) => new RegExp(p));
  const chains = flagBool('chains');
  const short = flagBool('short');
  const limit = Number(flagValue('limit') ?? '20');

  const raw = readFileSync(dumpPath, 'utf8').split('\n').filter(Boolean);
  const entries: ModuleEntry[] = raw.map((l) => JSON.parse(l));
  const byId = new Map<string, ModuleEntry>();
  for (const e of entries) byId.set(e.id, e);

  // Find a common prefix to strip when --short is set. Use the directory
  // containing the most modules.
  let prefix = '';
  if (short) {
    const counts = new Map<string, number>();
    for (const e of entries) {
      const m = /^(.*\/(?:build\/[^/]+\/kibana[^/]*|packages|src|x-pack))\//.exec(e.id);
      if (m) counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top) prefix = top[0] + '/';
  }
  const fmt = (id: string | null): string =>
    id == null ? '<entry>' : prefix && id.startsWith(prefix) ? id.slice(prefix.length) : id;

  // No patterns: list top packages by module count (extracted from path).
  if (patterns.length === 0) {
    const pkgRe = /node_modules\/(@[^/]+\/[^/]+|[^/]+)/;
    const counts = new Map<string, number>();
    for (const e of entries) {
      const m = pkgRe.exec(e.id);
      if (m) counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 50);
    process.stdout.write(`Total modules in cache: ${entries.length}\n\n`);
    process.stdout.write(`Top 50 packages by module count:\n`);
    for (const [pkg, n] of sorted) {
      process.stdout.write(`  ${String(n).padStart(5)}  ${pkg}\n`);
    }
    return;
  }

  for (const re of patterns) {
    const matches = entries.filter((e) => re.test(e.id));
    process.stdout.write(`\n=== /${re.source}/  →  ${matches.length} module(s) ===\n`);
    if (matches.length === 0) continue;

    if (!chains) {
      // List the matches and ALL their immediate parents (multi-parent graph).
      const shown = matches.slice(0, limit);
      for (const m of shown) {
        process.stdout.write(`  ${fmt(m.id)}\n`);
        for (const p of m.parents) process.stdout.write(`      ← ${fmt(p)}\n`);
      }
      if (matches.length > shown.length) {
        process.stdout.write(`  ... ${matches.length - shown.length} more\n`);
      }
      continue;
    }

    // BFS upward from each match through ALL parents, emitting each unique
    // (child <- parent) edge once. The shared upper portions of chains
    // collapse naturally because edges dedupe.
    const seenEdge = new Set<string>();
    let printed = 0;
    const queue: string[] = matches.map((m) => m.id);
    const visited = new Set<string>();
    process.stdout.write(`\n  edges (child ← parent):\n`);
    while (queue.length && printed < limit * 50) {
      const cur = queue.shift()!;
      if (visited.has(cur)) continue;
      visited.add(cur);
      const e = byId.get(cur);
      const parents = e ? e.parents : [];
      if (parents.length === 0) {
        const k = `${cur}|<entry>`;
        if (!seenEdge.has(k)) {
          seenEdge.add(k);
          process.stdout.write(`    ${fmt(cur)}\n      ← <entry>\n`);
          printed++;
        }
        continue;
      }
      for (const p of parents) {
        const k = `${cur}|${p}`;
        if (seenEdge.has(k)) continue;
        seenEdge.add(k);
        process.stdout.write(`    ${fmt(cur)}\n      ← ${fmt(p)}\n`);
        printed++;
        queue.push(p);
      }
    }
  }
}
