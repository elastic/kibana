/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';
import { execSync, execFileSync } from 'child_process';
import Fs from 'fs';
import { REPO_ROOT } from '@kbn/repo-info';
import { createFailError } from '@kbn/dev-cli-errors';
import type { Command } from '@kbn/dev-cli-runner';
import { activateWorktreeOrUseSourceRepo } from '@kbn/workspaces';
import { formatComparisonResults } from './format_results';

const runInWorktree = async (
  ref: string | undefined,
  label: string,
  dist: boolean,
  throttle: string,
  log: any
): Promise<Record<string, any>> => {
  const workspace = await activateWorktreeOrUseSourceRepo({ log, ref });
  const wsRoot = workspace.getDir();

  log.info(`[${label}] Using workspace at ${wsRoot}`);

  // Bootstrap if needed
  const nodeModulesExist = Fs.existsSync(resolve(wsRoot, 'node_modules'));
  if (!nodeModulesExist) {
    log.info(`[${label}] Running yarn kbn bootstrap...`);
    execSync('yarn kbn bootstrap', { cwd: wsRoot, stdio: 'inherit' });
  }

  // Build dist if requested
  if (dist) {
    const useRspack = process.env.KBN_USE_RSPACK === 'true' || process.env.KBN_USE_RSPACK === '1';
    if (useRspack) {
      log.info(`[${label}] Building rspack dist bundles...`);
      execSync('node scripts/build_rspack_bundles.js --dist', {
        cwd: wsRoot,
        stdio: 'inherit',
        env: { ...process.env, KBN_USE_RSPACK: 'true' },
      });
    } else {
      log.info(`[${label}] Building legacy dist bundles...`);
      execSync('node scripts/build_kibana_platform_plugins.js --dist', {
        cwd: wsRoot,
        stdio: 'inherit',
      });
    }
  }

  // Find the spec file in the worktree
  const specPath = resolve(
    wsRoot,
    'packages/kbn-perf-page-load/test/scout_lighthouse/ui/tests/lighthouse_page_load.spec.ts'
  );

  if (!Fs.existsSync(specPath)) {
    throw createFailError(
      `[${label}] Spec file not found at ${specPath}. ` +
        `The @kbn/perf-page-load package may not exist in this ref.`
    );
  }

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

  if (dist) {
    env.LIGHTHOUSE_DIST = 'true';
  }

  log.info(`[${label}] Running Lighthouse benchmark...`);

  try {
    execFileSync(
      process.execPath,
      [
        resolve(wsRoot, 'scripts/scout.js'),
        'run-tests',
        '--arch',
        'stateful',
        '--domain',
        'classic',
        '--testFiles',
        specPath,
      ],
      {
        cwd: wsRoot,
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

export const compareRefsCmd: Command<{}> = {
  name: 'compare-refs',
  description: 'Compare Lighthouse benchmarks between two git refs using worktrees',
  usage: 'node scripts/perf_page_load.js compare-refs <ref1> <ref2> [--dist] [--throttle devtools]',
  flags: {
    boolean: ['dist'],
    string: ['throttle', 'threshold'],
    default: { throttle: 'provided', threshold: '5' },
    help: `
      <ref1>        Git ref for baseline (or empty for current working directory).
      <ref2>        Git ref to compare against.
      --dist        Build and serve dist bundles per ref.
      --throttle    Throttling mode: 'provided' (default) or 'devtools'.
      --threshold   Regression threshold percentage (default: 5).
    `,
  },
  run: async ({ flagsReader, flags, log }) => {
    const positional = flags._;
    if (positional.length < 2) {
      throw createFailError(
        'Two git refs are required.\n' +
          'Usage: node scripts/perf_page_load.js compare-refs <ref1> <ref2>'
      );
    }

    const [ref1, ref2] = positional.map(String);
    let label1 = ref1 || 'cwd';
    let label2 = ref2 || 'cwd';
    if (label1 === label2) {
      label1 = `${label1}-baseline`;
      label2 = `${label2}-compare`;
    }
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

    log.info(`=== Phase 1/2: ${label1} ===`);
    const results1 = await runInWorktree(ref1 || undefined, label1, dist, throttle, log);

    log.info(`=== Phase 2/2: ${label2} ===`);
    const results2 = await runInWorktree(ref2 || undefined, label2, dist, throttle, log);

    const { table, regressions } = formatComparisonResults(
      label1,
      results1,
      label2,
      results2,
      threshold
    );

    log.info('\n=== Ref Comparison ===');
    log.info('\n' + table);

    if (regressions.length > 0) {
      log.warning(`Regressions exceeding ${threshold}% threshold:`);
      for (const r of regressions) {
        log.warning(`  - ${r}`);
      }
      throw createFailError(`${regressions.length} regression(s) detected.`);
    }

    log.success(`No regressions beyond ${threshold}% threshold.`);
  },
};
