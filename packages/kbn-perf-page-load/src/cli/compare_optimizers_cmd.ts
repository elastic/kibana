/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// [rspack-transition] This entire file is deleted when the legacy optimizer is removed.
// See packages/kbn-rspack-optimizer/LEGACY_REMOVAL_CHECKLIST.md

import { resolve } from 'path';
import { execSync, execFileSync } from 'child_process';
import Fs from 'fs';
import { REPO_ROOT } from '@kbn/repo-info';
import { createFailError } from '@kbn/dev-cli-errors';
import type { Command } from '@kbn/dev-cli-runner';
import { formatComparisonResults } from './format_results';

const SPEC_PATH = resolve(
  __dirname,
  '../../test/scout_lighthouse/ui/tests/lighthouse_page_load.spec.ts'
);

const runBenchmark = (
  label: string,
  useRspack: boolean,
  dist: boolean,
  throttle: string,
  log: any
): Record<string, any> => {
  const scoutDir = resolve(REPO_ROOT, '.scout/perf-page-load');
  Fs.mkdirSync(scoutDir, { recursive: true });
  const resultFile = resolve(scoutDir, `${label}.json`);

  if (Fs.existsSync(resultFile)) {
    Fs.unlinkSync(resultFile);
  }

  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
    PERF_LH_RESULT_FILE: resultFile,
    LIGHTHOUSE_THROTTLE: throttle,
  };

  if (useRspack) {
    env.KBN_USE_RSPACK = 'true';
  } else {
    delete env.KBN_USE_RSPACK;
  }

  if (dist) {
    env.LIGHTHOUSE_DIST = 'true';

    if (useRspack) {
      log.info(`[${label}] Building rspack dist bundles...`);
      execSync('node scripts/build_rspack_bundles.js --dist', {
        cwd: REPO_ROOT,
        stdio: 'inherit',
        env,
      });
    } else {
      // [rspack-transition] Legacy build path
      log.info(`[${label}] Building legacy dist bundles...`);
      execSync('node scripts/build_kibana_platform_plugins.js --dist', {
        cwd: REPO_ROOT,
        stdio: 'inherit',
        env,
      });
    }
  }

  log.info(`[${label}] Running Lighthouse benchmark...`);

  try {
    execFileSync(
      process.execPath,
      [
        resolve(REPO_ROOT, 'scripts/scout.js'),
        'run-tests',
        '--arch',
        'stateful',
        '--domain',
        'classic',
        '--testFiles',
        SPEC_PATH,
      ],
      {
        cwd: REPO_ROOT,
        stdio: 'inherit',
        env,
      }
    );
  } catch {
    if (!Fs.existsSync(resultFile)) {
      throw createFailError(`[${label}] Benchmark failed and no results were written.`);
    }
    log.warning(`[${label}] Scout exited with non-zero code but results were written.`);
  }

  if (!Fs.existsSync(resultFile)) {
    throw createFailError(`[${label}] No result file found at ${resultFile}`);
  }

  return JSON.parse(Fs.readFileSync(resultFile, 'utf-8'));
};

/**
 * Compare legacy vs rspack optimizer benchmarks.
 *
 * CRITICAL: Runs legacy FIRST, then rspack. Both write shared deps to
 * target/public/bundles/kbn-ui-shared-deps-*. Running rspack second cleanly
 * overwrites. Legacy mode doesn't read rspack-specific files (chunk-manifest.json,
 * kibana.bundle.js). The reverse order could leave stale rspack artifacts.
 */
export const compareOptimizersCmd: Command<{}> = {
  name: 'compare-optimizers',
  description: '[rspack-transition] Compare legacy vs rspack optimizer benchmarks',
  usage: 'node scripts/perf_page_load.js compare-optimizers [--dist] [--throttle devtools]',
  flags: {
    boolean: ['dist'],
    string: ['throttle', 'threshold'],
    default: { throttle: 'provided', threshold: '5' },
    help: `
      --dist        Build and serve dist bundles for each optimizer.
      --throttle    Throttling mode: 'provided' (default) or 'devtools'.
                    'devtools' requires --dist.
      --threshold   Regression threshold percentage (default: 5).
    `,
  },
  run: async ({ flagsReader, log }) => {
    const dist = flagsReader.boolean('dist');
    const throttle = flagsReader.string('throttle') ?? 'provided';
    const thresholdStr = flagsReader.string('threshold') ?? '5';
    const threshold = Number(thresholdStr);
    if (!Number.isFinite(threshold)) {
      throw createFailError(`Invalid threshold value: ${thresholdStr}`);
    }

    if (throttle === 'devtools' && !dist) {
      throw createFailError('DevTools throttling requires dist bundles (--dist).');
    }

    // Run legacy FIRST, then rspack (see JSDoc above for rationale)
    log.info('=== Phase 1/2: Legacy optimizer ===');
    const legacyResults = runBenchmark('legacy', false, dist, throttle, log);

    log.info('=== Phase 2/2: Rspack optimizer ===');
    const rspackResults = runBenchmark('rspack', true, dist, throttle, log);

    // Compare
    const { table, regressions } = formatComparisonResults(
      'legacy',
      legacyResults,
      'rspack',
      rspackResults,
      threshold
    );

    log.info('\n=== Legacy vs Rspack Comparison ===');
    log.info('\n' + table);

    if (regressions.length > 0) {
      log.warning(`Regressions exceeding ${threshold}% threshold:`);
      for (const r of regressions) {
        log.warning(`  - ${r}`);
      }
    } else {
      log.success(`No regressions beyond ${threshold}% threshold.`);
    }
  },
};
