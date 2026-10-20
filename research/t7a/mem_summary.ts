/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* RESEARCH ONLY (Track 7.A). Summarises a memprobe.sh directory (MiB). usage: node mem_summary.ts <dir> */
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

const dir = process.argv[2];
const mib = (b?: number) => (typeof b === 'number' ? Math.round((b / 2 ** 20) * 10) / 10 : null);
const read = (f: string) => (existsSync(join(dir, f)) ? JSON.parse(readFileSync(join(dir, f), 'utf8')) : undefined);
const mem = (f: string) => read(f)?.value?.memory;
const rssKb = (f: string) => read(f)?.rss_kb ?? read(f)?.rss_kb_no_host;
const kids = (f: string) =>
  existsSync(join(dir, f))
    ? readFileSync(join(dir, f), 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((l) => l.split(' '))
        .map(([pid, rss, ...cmd]) => ({ pid, rssMiB: Math.round(Number(rss) / 1024), cmd: cmd.join(' ') }))
    : [];
const samples = existsSync(join(dir, '05_samples.ndjson'))
  ? readFileSync(join(dir, '05_samples.ndjson'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  : [];
const heaps = samples.map((s) => s.probe?.heapUsed).filter((x): x is number => typeof x === 'number');
const kidPeak = samples
  .flatMap((s) => String(s.kids ?? '').split(' ').filter(Boolean).map((x: string) => Number(x.split(':')[1])))
  .reduce((a, b) => Math.max(a, b), 0);
const summary = {
  dir,
  server_rss_no_host_mib: Math.round(rssKb('00_baseline.json') / 1024),
  kit_only_slot_heap_after_gc_mib: mib(mem('02_kitonly_gc.json')?.heapUsed),
  server_rss_kit_only_mib: Math.round(rssKb('02_rss.json') / 1024),
  island_boot: read('03_boot.json')?.value,
  island_idle_heap_after_gc_mib: mib(mem('04_island_idle_gc.json')?.heapUsed),
  island_idle_external_mib: mib(mem('04_island_idle_gc.json')?.external),
  server_rss_island_idle_mib: Math.round(rssKb('04_rss.json') / 1024),
  replay_samples: heaps.length,
  replay_peak_sampled_heap_mib: mib(Math.max(...heaps)),
  replay_peak_server_rss_mib: Math.round(Math.max(...samples.map((s) => s.rss_kb)) / 1024),
  replay_peak_child_rss_mib: kidPeak ? Math.round(kidPeak / 1024) : null,
  after_replay_heap_no_gc_mib: mib(mem('06_after_nogc.json')?.heapUsed),
  after_replay_heap_after_gc_mib: mib(mem('07_after_gc.json')?.heapUsed),
  server_rss_after_mib: Math.round(rssKb('07_rss.json') / 1024),
  children_idle: kids('04_kids.txt'),
  children_after: kids('07_kids.txt'),
};
writeFileSync(join(dir, 'summary.json'), JSON.stringify(summary, null, 1));
console.log(JSON.stringify(summary, null, 1));
