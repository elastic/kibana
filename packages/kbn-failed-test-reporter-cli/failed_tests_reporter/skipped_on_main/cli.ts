/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createFlagError } from '@kbn/dev-cli-errors';
import { run } from '@kbn/dev-cli-runner';

import {
  collectJUnitFailures,
  collectScoutFailures,
  evaluateFailures,
  readFileFromGit,
} from './evaluate';

/**
 * Exit codes: 0 when there is at least one failure and every failure is skipped on main
 * (safe to ignore), 1 otherwise. stdout carries only the classification JSON so callers can
 * pipe it to jq; the human readable summary goes to stderr.
 */
export function runSkippedOnMainCli() {
  run(
    async ({ flagsReader }) => {
      const mainRef = flagsReader.requiredString('main-ref');
      const baseRef = flagsReader.requiredString('base-ref');
      const headRef = flagsReader.requiredString('head-ref');
      const junitFiles = flagsReader.arrayOfPaths('junit-file') ?? [];
      const scoutFiles = flagsReader.arrayOfPaths('scout-failures') ?? [];

      if (junitFiles.length === 0 && scoutFiles.length === 0) {
        throw createFlagError('at least one --junit-file or --scout-failures is required');
      }

      const failures = [
        ...(await collectJUnitFailures(junitFiles)),
        ...collectScoutFailures(scoutFiles),
      ];
      const evaluation = evaluateFailures(failures, {
        mainRef,
        baseRef,
        headRef,
        readFile: readFileFromGit,
      });

      process.stdout.write(JSON.stringify(evaluation, null, 2) + '\n');

      let summary: string;
      if (failures.length === 0) {
        summary = 'no failures found in the given reports; not safe to ignore';
        process.exitCode = 1;
      } else if (evaluation.real.length > 0) {
        summary = `${evaluation.real.length} of ${failures.length} failure(s) are not skipped on ${mainRef}`;
        process.exitCode = 1;
      } else {
        summary = `all ${failures.length} failure(s) would be skipped after rebasing onto ${mainRef}`;
      }
      process.stderr.write(`${summary}\n`);
    },
    {
      description: `
        Checks whether failed tests would be skipped had the PR been rebased onto its target
        branch: each failing file is three-way merged (merge base -> PR head vs target branch)
        and the test must resolve to a skip in the merged file.
      `,
      flags: {
        string: ['main-ref', 'base-ref', 'head-ref', 'junit-file', 'scout-failures'],
        help: `
          --main-ref        git ref of the target branch (e.g. FETCH_HEAD after fetching main)
          --base-ref        git ref of the PR merge base
          --head-ref        git ref of the PR head the tests ran against (e.g. HEAD)
          --junit-file      FTR JUnit XML file to read failures from (repeatable)
          --scout-failures  Scout scout-failures-*.ndjson file to read failures from (repeatable)
        `,
      },
    }
  );
}
