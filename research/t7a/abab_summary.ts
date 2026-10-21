/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-console */
/* RESEARCH ONLY (Track 7.A). Derives the ABAB table from harness scorecards.
 * usage: node abab_summary.ts <runsDir> <runIdPrefix> <out.json> */
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const [runsDir, prefix, out] = process.argv.slice(2);
const PHASE = 'alerting-esql-1000x2';
const runs = readdirSync(runsDir)
  .filter((d) => d.startsWith(prefix))
  .sort()
  .map((id) => {
    const rows = JSON.parse(readFileSync(join(runsDir, id, 'scorecard.json'), 'utf8')) as Array<
      Record<string, any>
    >;
    const md = readFileSync(join(runsDir, id, 'scorecard.md'), 'utf8');
    const pod = rows.find((r) => r.kind === 'pod' && r.phase === PHASE)!;
    const cluster = rows.find((r) => r.kind === 'cluster' && r.phase === PHASE)!;
    const arm = id.includes('offmain-localso')
      ? 'offmain-localso'
      : id.includes('offmain')
      ? 'offmain'
      : 'main';
    const pair = Number(/abab-(\d+)/.exec(id)![1]);
    return {
      id,
      arm,
      pair,
      run_valid: /run-level: valid/.test(md) && rows.every((r) => r.valid !== false),
      p95_x: pod.vs_baseline.probe_p95,
      p99_x: pod.vs_baseline.probe_p99,
      p95_ms: pod.metrics.probe_p95_ms,
      p99_ms: pod.metrics.probe_p99_ms,
      max_ms: pod.metrics.probe_max_ms,
      hb_gap_overlap_ms: pod.metrics.hb_gap_max_overlap_ms,
      tm_missed_polls: pod.metrics.tm_missed_poll_cycles,
      tm_poll_max_gap_ms: pod.metrics.tm_poll_max_gap_ms,
      elu: pod.metrics.elu_mean,
      gc_count: pod.metrics.gc_count,
      gc_total_ms: pod.metrics.gc_total_ms,
      heap_sampled_max_mb: pod.metrics.heap_sampled_max_mb,
      rss_sampled_max_mb: pod.metrics.rss_sampled_max_mb,
      tick_drift_p99_x: cluster.vs_baseline.tick_drift_p99,
      tick_drift_p99_ms: cluster.metrics.tick_drift_p99_ms,
      ticks: `${cluster.metrics.ticks_ran}/${cluster.metrics.ticks_scheduled}`,
      tick_completion: cluster.metrics.tick_completion,
    };
  });
const gmean = (xs: number[]) => Math.exp(xs.reduce((a, x) => a + Math.log(x), 0) / xs.length);
const metrics = [
  'p95_x',
  'p99_x',
  'hb_gap_overlap_ms',
  'tick_drift_p99_x',
  'elu',
  'gc_total_ms',
] as const;
const arms = [...new Set(runs.map((r) => r.arm))];
const byArm = Object.fromEntries(
  arms.map((arm) => {
    const rs = runs.filter((r) => r.arm === arm);
    return [
      arm,
      Object.fromEntries(
        metrics.map((m) => [
          m,
          {
            gmean: gmean(rs.map((r) => r[m] as number)),
            min: Math.min(...rs.map((r) => r[m] as number)),
            max: Math.max(...rs.map((r) => r[m] as number)),
          },
        ])
      ),
    ];
  })
);
// paired (same pair index) ratios vs main
const paired = Object.fromEntries(
  arms
    .filter((a) => a !== 'main')
    .map((arm) => [
      arm,
      Object.fromEntries(
        metrics.map((m) => {
          const ratios = runs
            .filter((r) => r.arm === arm)
            .map(
              (r) =>
                (r[m] as number) /
                (runs.find((x) => x.arm === 'main' && x.pair === r.pair)![m] as number)
            );
          return [m, { gmean: gmean(ratios), ratios }];
        })
      ),
    ])
);
const summary = {
  prefix,
  n: runs.length,
  all_valid: runs.every((r) => r.run_valid),
  runs,
  byArm,
  paired_vs_main: paired,
};
writeFileSync(out, JSON.stringify(summary, null, 1));
for (const r of runs)
  console.log(
    [
      r.arm.padEnd(16),
      r.pair,
      r.run_valid ? 'valid' : 'INVALID',
      `p95x ${r.p95_x.toFixed(2)}`,
      `p99x ${r.p99_x.toFixed(2)}`,
      `hb ${r.hb_gap_overlap_ms.toFixed(0)}ms`,
      `missed ${r.tm_missed_polls}`,
      `drift p99x ${r.tick_drift_p99_x.toFixed(1)}`,
      `ticks ${r.ticks}`,
      `gc ${r.gc_total_ms.toFixed(0)}ms`,
    ].join(' | ')
  );
console.log(
  JSON.stringify(
    {
      byArm,
      paired_vs_main: Object.fromEntries(
        Object.entries(paired).map(([a, v]) => [
          a,
          Object.fromEntries(
            Object.entries(v).map(([m, x]) => [m, (x as { gmean: number }).gmean.toFixed(3)])
          ),
        ])
      ),
    },
    null,
    1
  )
);
