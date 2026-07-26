/**
 * Shared benchmark metadata: the level ladder, scoring ceilings/weights and
 * sandbox spec tiers. Keep in sync with the table in ../README.md.
 */

export const SPEC_TIERS = {
  small: { cpus: 2, memGb: 4, diskGb: 20 },
  medium: { cpus: 4, memGb: 8, diskGb: 30 },
  large: { cpus: 8, memGb: 16, diskGb: 40 },
};

export const LEVELS = {
  l0: { task: 'l0_tti.sh', ceilingMs: 30_000, defaultIterations: 20, spec: 'small' },
  l1: { task: 'l1_clone.sh', ceilingMs: 600_000, defaultIterations: 5, spec: 'small' },
  l2: { task: 'l2_bootstrap.sh', ceilingMs: 1_800_000, defaultIterations: 3, spec: 'medium' },
  l3: { task: 'l3_dev_loop.sh', ceilingMs: 900_000, defaultIterations: 3, spec: 'medium' },
  l4: { task: 'l4_es_snapshot.sh', ceilingMs: 900_000, defaultIterations: 3, spec: 'large' },
  l5: { task: 'l5_full_stack.sh', ceilingMs: 2_700_000, defaultIterations: 3, spec: 'large' },
  l6: { task: null, ceilingMs: 300_000, defaultIterations: 5, spec: 'large' }, // warm resume (runner mode)
};

/** Overall score weights per level (must sum to 1). */
export const LEVEL_WEIGHTS = {
  l0: 0.05,
  l1: 0.1,
  l2: 0.15,
  l3: 0.05,
  l4: 0.1,
  l5: 0.35,
  l6: 0.2,
};

/** Latency percentile weights within a level score. */
export const STAT_WEIGHTS = { median: 0.6, p95: 0.25, p99: 0.15 };
