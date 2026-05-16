/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';

import { createFlagError } from '@kbn/dev-cli-errors';
import { run } from '@kbn/dev-cli-runner';
import globby from 'globby';
import normalize from 'normalize-path';

import { makeFailedTestCaseIter, readTestReport } from './test_report';

export async function collectFailedTestNames(junitDir: string): Promise<Set<string>> {
  const xmlPaths = await globby(normalize(Path.resolve(junitDir, '*.xml')), { absolute: true });
  const names = new Set<string>();
  for (const xmlPath of xmlPaths) {
    const report = await readTestReport(xmlPath);
    for (const testCase of makeFailedTestCaseIter(report)) {
      names.add(testCase.$.name);
    }
  }
  return names;
}

export function computeIntersection(prev: Set<string>, current: Set<string>): string[] {
  return [...current].filter((name) => prev.has(name));
}

export function runRetryResultCheckerCli() {
  run(
    async ({ log, flags }) => {
      const [command, ...rest] = flags._;

      if (command === 'list-failures') {
        const [junitDir] = rest;
        if (!junitDir) {
          throw createFlagError('Usage: list-failures <junit-dir>');
        }
        const names = await collectFailedTestNames(junitDir);
        if (names.size > 0) {
          process.stdout.write([...names].join('\n') + '\n');
        }
        return;
      }

      if (command === 'check-intersection') {
        const junitDir = flags['junit-dir'];
        const prevFailuresFile = flags['prev-failures-file'];

        if (typeof junitDir !== 'string' || !junitDir) {
          throw createFlagError('--junit-dir is required');
        }
        if (typeof prevFailuresFile !== 'string' || !prevFailuresFile) {
          throw createFlagError('--prev-failures-file is required');
        }

        const prevContent = Fs.readFileSync(prevFailuresFile, 'utf8');
        const prevFailed = new Set(
          prevContent
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean)
        );

        if (prevFailed.size === 0) {
          log.info('No previously-failing tests found — nothing to intersect');
          return;
        }

        const currentFailed = await collectFailedTestNames(junitDir);
        const intersection = computeIntersection(prevFailed, currentFailed);

        if (intersection.length === 0) {
          // Known limitation: if a different test fails before reaching the previously-failing test on retry (due to --bail), the intersection will appear empty and the step will be marked green even though the original failing test was never verified.
          // We could possibly drop the bail flag.
          log.success(
            `All ${prevFailed.size} previously-failing test(s) either passed or did not run on retry`
          );
          return;
        }

        log.error(`${intersection.length} test(s) failed in both attempts:`);
        for (const name of intersection) {
          log.error(`  ${name}`);
        }
        process.exit(1);
      }

      throw createFlagError(
        `Unknown command: ${command}. Valid commands: list-failures, check-intersection`
      );
    },
    {
      description: `
        Utilities for evaluating FTR retry results.

        Commands:
          list-failures <junit-dir>
            Lists all failed test names (one per line) found in *.xml files under
            the given directory. Used to capture attempt-1 failures before retry.

          check-intersection --junit-dir <dir> --prev-failures-file <file>
            Compares the failed tests in <dir> against the names in <file>.
            Exits 0 if the intersection is empty (previously-failing tests recovered).
            Exits 1 if any previously-failing test still fails.
      `,
      flags: {
        string: ['junit-dir', 'prev-failures-file'],
        help: `
          --junit-dir            Directory containing JUnit XML files for the current attempt
          --prev-failures-file   File with newline-separated test names that failed in attempt 1
        `,
      },
    }
  );
}
