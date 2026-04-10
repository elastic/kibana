/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import { resolve } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { createFailError } from '@kbn/dev-cli-errors';
import type { Command } from '@kbn/dev-cli-runner';
import { formatComparisonResults } from './format_results';

export const compareCmd: Command<{}> = {
  name: 'compare',
  description: 'Compare two saved Lighthouse result JSON files',
  usage: 'node scripts/perf_page_load.js compare <file1> <file2> [--threshold 5]',
  flags: {
    string: ['threshold'],
    default: { threshold: '5' },
    help: `
      <file1>       Path to the first (baseline) JSON result file.
      <file2>       Path to the second (comparison) JSON result file.
      --threshold   Regression threshold percentage (default: 5).
    `,
  },
  run: async ({ flagsReader, flags, log }) => {
    const positional = flags._;
    if (positional.length < 2) {
      throw createFailError(
        'Two result file paths are required.\n' +
          'Usage: node scripts/perf_page_load.js compare <file1> <file2>'
      );
    }

    const [file1Path, file2Path] = positional.map((f) => resolve(REPO_ROOT, String(f)));
    const thresholdStr = flagsReader.string('threshold') ?? '5';
    const threshold = Number(thresholdStr);
    if (!Number.isFinite(threshold)) {
      throw createFailError(`Invalid threshold value: ${thresholdStr}`);
    }

    if (!Fs.existsSync(file1Path)) {
      throw createFailError(`File not found: ${file1Path}`);
    }
    if (!Fs.existsSync(file2Path)) {
      throw createFailError(`File not found: ${file2Path}`);
    }

    const results1 = JSON.parse(Fs.readFileSync(file1Path, 'utf-8'));
    const results2 = JSON.parse(Fs.readFileSync(file2Path, 'utf-8'));

    const { table, regressions } = formatComparisonResults(
      'baseline',
      results1,
      'compare',
      results2,
      threshold
    );

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
