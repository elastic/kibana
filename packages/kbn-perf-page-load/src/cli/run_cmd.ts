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
import { formatSingleResults } from './format_results';

const SPEC_PATH = resolve(
  __dirname,
  '../../test/scout_lighthouse/ui/tests/lighthouse_page_load.spec.ts'
);

export const runCmd: Command<{}> = {
  name: 'run',
  description: 'Run a Lighthouse performance benchmark on the current checkout',
  usage: 'node scripts/perf_page_load.js run [--dist] [--throttle devtools]',
  flags: {
    boolean: ['dist'],
    string: ['throttle', 'output'],
    default: { throttle: 'provided' },
    help: `
      --dist        Build and serve dist bundles (pre-built, minified). Without this flag,
                    the dev optimizer compiles at runtime.
      --throttle    Throttling mode: 'provided' (no throttle, default) or 'devtools'
                    (40ms RTT, 10Mbps, 4x CPU). 'devtools' requires --dist.
      --output      Save the JSON results to this file path.
    `,
  },
  run: async ({ flagsReader, log }) => {
    const dist = flagsReader.boolean('dist');
    const throttle = flagsReader.string('throttle') ?? 'provided';
    const output = flagsReader.string('output');
    const useRspack = process.env.KBN_USE_RSPACK === 'true' || process.env.KBN_USE_RSPACK === '1';

    // Guard: devtools throttle requires dist
    if (throttle === 'devtools' && !dist) {
      throw createFailError(
        'DevTools throttling requires dist bundles (--dist). Dev bundles (~305 MB) exceed ' +
          'the network idle threshold under 10 Mbps throttling. ' +
          'Either add --dist or remove --throttle devtools.'
      );
    }

    // Build dist bundles if requested
    if (dist) {
      if (useRspack) {
        log.info('Building rspack dist bundles...');
        execSync('node scripts/build_rspack_bundles.js --dist', {
          cwd: REPO_ROOT,
          stdio: 'inherit',
          env: { ...process.env, KBN_USE_RSPACK: 'true' },
        });
      } else {
        // [rspack-transition] Legacy build path — delete when legacy optimizer is removed
        log.info('Building legacy dist bundles...');
        execSync('node scripts/build_kibana_platform_plugins.js --dist', {
          cwd: REPO_ROOT,
          stdio: 'inherit',
        });
      }

      // Validate bundles exist
      const bundlesDir = resolve(REPO_ROOT, 'target/public/bundles');
      if (!Fs.existsSync(bundlesDir)) {
        throw createFailError(
          'No dist bundles found at target/public/bundles/.\n' +
            'The build may have failed. Check the output above.'
        );
      }
    }

    // Set up temp file for result handoff
    const scoutDir = resolve(REPO_ROOT, '.scout/perf-page-load');
    Fs.mkdirSync(scoutDir, { recursive: true });
    const resultFile = resolve(scoutDir, `_latest_${process.pid}.json`);

    const env: Record<string, string> = {
      ...(process.env as Record<string, string>),
      PERF_LH_RESULT_FILE: resultFile,
      LIGHTHOUSE_THROTTLE: throttle,
    };

    if (dist) {
      env.LIGHTHOUSE_DIST = 'true';
    }

    // Spawn Scout to run the spec
    log.info(
      `Running Lighthouse benchmark (throttle=${throttle}, dist=${dist}, rspack=${useRspack})...`
    );

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
    } catch (e) {
      // Scout exits non-zero on test failure; check if results were written
      if (!Fs.existsSync(resultFile)) {
        throw createFailError(
          'Lighthouse benchmark failed and no results were written. ' +
            'Check the Scout output above for errors.'
        );
      }
      log.warning('Scout exited with non-zero code but results were written. Proceeding.');
    }

    // Read results
    if (!Fs.existsSync(resultFile)) {
      throw createFailError('No result file found at ' + resultFile);
    }

    const results = JSON.parse(Fs.readFileSync(resultFile, 'utf-8'));
    log.info('\n' + JSON.stringify(results, null, 2));
    log.info('\n' + formatSingleResults(results));

    // Save to output if requested
    if (output) {
      const outDir = resolve(REPO_ROOT, output);
      Fs.mkdirSync(resolve(outDir, '..'), { recursive: true });
      Fs.writeFileSync(outDir, JSON.stringify(results, null, 2));
      log.info(`Results saved to ${output}`);
    }
  },
};
