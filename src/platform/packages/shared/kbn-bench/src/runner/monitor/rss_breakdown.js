/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TEMPORARY diagnostic, do not merge: attributes a benchmarked Kibana process's RSS to V8 heap,
// native allocations, mapped files and thread stacks. Linux only (reads /proc).

const fs = require('fs');
const path = require('path');
const v8 = require('node:v8');
const { walkMainArenaHeap } = require('./malloc_arena_walk');

const MIB_PER_KIB = 1 / 1024;
const SIXTY_FOUR_MIB = 64 * 1024 * 1024;
const TOP_GROUPS = 30;
const TOP_ANON_MAPPINGS = 25;

const round1 = (value) => Math.round(value * 10) / 10;
const kibToMib = (kib) => round1(kib * MIB_PER_KIB);
const bytesToMib = (bytes) => round1(bytes / (1024 * 1024));

const KB_LINE = /^(\w+):\s+(\d+) kB$/;

const parseKbFields = (text) => {
  const fields = {};
  for (const line of text.split('\n')) {
    const match = KB_LINE.exec(line);
    if (match) {
      fields[match[1]] = Number(match[2]);
    }
  }
  return fields;
};

const SMAPS_HEADER = /^([0-9a-f]+)-([0-9a-f]+)\s+(\S{4})\s+[0-9a-f]+\s+\S+\s+\d+\s*(.*)$/;
const SMAPS_FIELD = /^(Size|Rss|Pss|Private_Dirty|Anonymous|Swap):\s+(\d+) kB$/;

const categorize = (pathname) => {
  if (!pathname) return 'anon';
  if (pathname === '[heap]') return 'brk_heap';
  if (pathname.startsWith('[stack')) return 'stack';
  if (pathname.startsWith('[anon:')) return pathname;
  if (pathname.startsWith('[')) return 'kernel_misc';

  const base = path.basename(pathname.replace(/ \(deleted\)$/, ''));
  if (base === 'node') return 'node_binary';
  if (base.endsWith('.node')) return `native_addon:${base}`;
  if (/\.so(\.|$)/.test(base)) return `shared_lib:${base}`;
  return `file:${base}`;
};

const parseSmaps = (text) => {
  const groups = new Map();
  const anonMappings = [];
  const totals = { rssKib: 0, anonymousKib: 0, executableAnonRssKib: 0 };
  let current;

  const flush = () => {
    if (!current) return;
    const group = groups.get(current.category) ?? {
      category: current.category,
      mappings: 0,
      sizeKib: 0,
      rssKib: 0,
      anonymousKib: 0,
      privateDirtyKib: 0,
    };
    group.mappings += 1;
    group.sizeKib += current.Size ?? 0;
    group.rssKib += current.Rss ?? 0;
    group.anonymousKib += current.Anonymous ?? 0;
    group.privateDirtyKib += current.Private_Dirty ?? 0;
    groups.set(current.category, group);

    totals.rssKib += current.Rss ?? 0;
    totals.anonymousKib += current.Anonymous ?? 0;
    if (current.category === 'anon') {
      if (current.perms.includes('x')) {
        totals.executableAnonRssKib += current.Rss ?? 0;
      }
      anonMappings.push({
        range: `${current.start}-${current.end}`,
        perms: current.perms,
        sizeKib: current.Size ?? 0,
        rssKib: current.Rss ?? 0,
        // User-space addresses are below 2^47, so they are exact in a double.
        startsOn64MiB: parseInt(current.start, 16) % SIXTY_FOUR_MIB === 0,
      });
    }
  };

  for (const line of text.split('\n')) {
    const header = SMAPS_HEADER.exec(line);
    if (header) {
      flush();
      current = {
        start: header[1],
        end: header[2],
        perms: header[3],
        category: categorize(header[4].trim()),
      };
      continue;
    }
    const field = SMAPS_FIELD.exec(line);
    if (field && current) {
      current[field[1]] = Number(field[2]);
    }
  }
  flush();

  const sorted = [...groups.values()].sort((a, b) => b.rssKib - a.rssKib);
  const top = sorted.slice(0, TOP_GROUPS);
  const rest = sorted.slice(TOP_GROUPS);

  return {
    totals,
    groups: top.map((group) => ({ ...group, rssMiB: kibToMib(group.rssKib) })),
    otherGroups: {
      count: rest.length,
      rssKib: rest.reduce((sum, group) => sum + group.rssKib, 0),
    },
    topAnonMappings: anonMappings.sort((a, b) => b.rssKib - a.rssKib).slice(0, TOP_ANON_MAPPINGS),
  };
};

const countThreadsByName = () => {
  const counts = {};
  for (const tid of fs.readdirSync('/proc/self/task')) {
    try {
      const name = fs.readFileSync(`/proc/self/task/${tid}/comm`, 'utf8').trim();
      counts[name] = (counts[name] ?? 0) + 1;
    } catch (_) {
      // thread exited while reading
    }
  }
  return counts;
};

const countActiveResources = () => {
  const counts = {};
  const resources =
    typeof process.getActiveResourcesInfo === 'function' ? process.getActiveResourcesInfo() : [];
  for (const name of resources) {
    counts[name] = (counts[name] ?? 0) + 1;
  }
  return counts;
};

const buildSummary = ({ status, memoryUsage, heapStatistics, heapCodeStatistics }) => {
  const rssAnonKib = status.RssAnon ?? 0;
  const v8PhysicalKib = heapStatistics.total_physical_size / 1024;
  const v8MallocedKib = heapStatistics.malloced_memory / 1024;
  const externalKib = memoryUsage.external / 1024;

  return {
    rssMiB: kibToMib(status.VmRSS ?? 0),
    rssAnonMiB: kibToMib(rssAnonKib),
    rssFileMiB: kibToMib(status.RssFile ?? 0),
    rssShmemMiB: kibToMib(status.RssShmem ?? 0),
    v8HeapUsedMiB: bytesToMib(heapStatistics.used_heap_size),
    v8HeapCommittedMiB: bytesToMib(heapStatistics.total_heap_size),
    v8HeapPhysicalMiB: kibToMib(v8PhysicalKib),
    v8MallocedMiB: kibToMib(v8MallocedKib),
    externalMiB: kibToMib(externalKib),
    arrayBuffersMiB: bytesToMib(memoryUsage.arrayBuffers),
    codeAndMetadataMiB: bytesToMib(heapCodeStatistics.code_and_metadata_size),
    bytecodeAndMetadataMiB: bytesToMib(heapCodeStatistics.bytecode_and_metadata_size),
    externalScriptSourceMiB: bytesToMib(heapCodeStatistics.external_script_source_size),
    // Not in V8's heap, malloc or external accounting: glibc arena overhead and fragmentation,
    // thread stacks, libuv/OpenSSL/zlib/ICU allocations and worker isolates.
    residualAnonMiB: kibToMib(rssAnonKib - v8PhysicalKib - v8MallocedKib - externalKib),
    threads: status.Threads,
  };
};

const resolveSide = (cwd) => (/[\\/]baseline([\\/]|$)/.test(cwd) ? 'baseline' : 'target');

const walkMainArenaSafely = () => {
  try {
    return walkMainArenaHeap();
  } catch (error) {
    return { ok: false, reason: `error: ${error.message}` };
  }
};

const collectRssBreakdown = (label) => {
  const statusText = fs.readFileSync('/proc/self/status', 'utf8');
  const status = {
    ...parseKbFields(statusText),
    Threads: Number(/^Threads:\s+(\d+)$/m.exec(statusText)?.[1]),
  };

  const memoryUsage = process.memoryUsage();
  const heapStatistics = v8.getHeapStatistics();
  const heapCodeStatistics = v8.getHeapCodeStatistics();
  const smaps = parseSmaps(fs.readFileSync('/proc/self/smaps', 'utf8'));

  return {
    label,
    pid: process.pid,
    cwd: process.cwd(),
    nodeVersion: process.versions.node,
    v8Version: process.versions.v8,
    nodeOptions: process.env.NODE_OPTIONS ?? null,
    mallocArenaMax: process.env.MALLOC_ARENA_MAX ?? null,
    ldPreload: process.env.LD_PRELOAD ?? null,
    summary: buildSummary({ status, memoryUsage, heapStatistics, heapCodeStatistics }),
    memoryUsage,
    heapStatistics,
    heapCodeStatistics,
    heapSpaces: Object.fromEntries(
      v8.getHeapSpaceStatistics().map((space) => [space.space_name, space])
    ),
    smapsRollupKib: parseKbFields(fs.readFileSync('/proc/self/smaps_rollup', 'utf8')),
    smaps,
    threadsByName: countThreadsByName(),
    activeResources: countActiveResources(),
    mainArena: walkMainArenaSafely(),
  };
};

const captureRssBreakdown = (label) => {
  const outDir = process.env.KBN_BENCH_RSS_BREAKDOWN_DIR;
  if (!outDir || process.platform !== 'linux') {
    return;
  }

  const breakdown = collectRssBreakdown(label);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, `${resolveSide(breakdown.cwd)}_${process.pid}_${label}.json`),
    `${JSON.stringify(breakdown)}\n`
  );
};

module.exports = { captureRssBreakdown, collectRssBreakdown, parseSmaps };
