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

import { makeFailedTestCaseIter, makeTestCaseIter, readTestReport } from './test_report';

const SNAPSHOT_FILE = '.smart_retry_snapshot';

export async function collectFailedTestNames(junitDir: string): Promise<Set<string>> {
  const xmlPaths = await globby(normalize(Path.resolve(junitDir, '*.xml')), { absolute: true });
  const names = new Set<string>();
  for (const xmlPath of xmlPaths) {
    const report = await readTestReport(xmlPath);
    for (const testCase of makeFailedTestCaseIter(report)) {
      names.add(testCase.$.name.trim());
    }
  }
  return names;
}

/**
 * Returns the names of test cases that completed without failure and without being skipped.
 * Used on retry to verify previously-failing tests explicitly passed, not merely that they
 * were absent from results (e.g. runner crash, beforeAll hook failure, or stale XML files
 * from the previous attempt coexisting on a persistent-workspace agent).
 */
export async function collectPassedTestNames(junitDir: string): Promise<Set<string>> {
  const xmlPaths = await globby(normalize(Path.resolve(junitDir, '*.xml')), { absolute: true });
  const names = new Set<string>();
  for (const xmlPath of xmlPaths) {
    const report = await readTestReport(xmlPath);
    for (const testCase of makeTestCaseIter(report)) {
      if (!testCase.failure && !testCase.skipped) {
        names.add(testCase.$.name.trim());
      }
    }
  }
  return names;
}

/**
 * Writes the current XML file list in junitDir to a snapshot file.
 * Call this before running a config so list-new-failures can diff against it.
 */
export async function snapshotJunitDir(junitDir: string): Promise<void> {
  const xmlPaths = await globby(normalize(Path.resolve(junitDir, '*.xml')), { absolute: true });
  Fs.mkdirSync(junitDir, { recursive: true });
  Fs.writeFileSync(Path.join(junitDir, SNAPSHOT_FILE), JSON.stringify(xmlPaths.sort()));
}

/**
 * Reads the snapshot written by snapshotJunitDir, diffs it against the current XML files,
 * and returns the failing test names from XMLs that were produced after the snapshot.
 * Deletes the snapshot file after reading.
 */
export async function collectNewFailedTestNames(junitDir: string): Promise<Set<string>> {
  const snapshotPath = Path.join(junitDir, SNAPSHOT_FILE);
  let before = new Set<string>();
  if (Fs.existsSync(snapshotPath)) {
    before = new Set<string>(JSON.parse(Fs.readFileSync(snapshotPath, 'utf8')));
    Fs.unlinkSync(snapshotPath);
  }
  const xmlPaths = await globby(normalize(Path.resolve(junitDir, '*.xml')), { absolute: true });
  const newPaths = xmlPaths.filter((p) => !before.has(p));
  const names = new Set<string>();
  for (const xmlPath of newPaths) {
    const report = await readTestReport(xmlPath);
    for (const tc of makeFailedTestCaseIter(report)) {
      names.add(tc.$.name.trim());
    }
  }
  return names;
}

export function computeIntersection(prev: Set<string>, current: Set<string>): string[] {
  return [...current].filter((name) => prev.has(name));
}

const readStdin = (): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on('data', (chunk) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    );
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    process.stdin.on('error', reject);
  });

export function runRetryResultCheckerCli() {
  run(
    async ({ log, flags }) => {
      const [command, ...rest] = flags._;

      if (command === 'snapshot') {
        const [junitDir] = rest;
        if (!junitDir) {
          throw createFlagError('Usage: snapshot <junit-dir>');
        }
        await snapshotJunitDir(junitDir);
        return;
      }

      if (command === 'list-new-failures') {
        const [junitDir] = rest;
        if (!junitDir) {
          throw createFlagError('Usage: list-new-failures <junit-dir>');
        }
        const names = await collectNewFailedTestNames(junitDir);
        if (names.size > 0) {
          process.stdout.write([...names].join('\n') + '\n');
        }
        return;
      }

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
        const prevFailuresStdin = flags['prev-failures-stdin'];

        if (typeof junitDir !== 'string' || !junitDir) {
          throw createFlagError('--junit-dir is required');
        }

        let prevContent: string;
        if (prevFailuresStdin) {
          prevContent = await readStdin();
        } else if (typeof prevFailuresFile === 'string' && prevFailuresFile) {
          prevContent = Fs.readFileSync(prevFailuresFile, 'utf8');
        } else {
          throw createFlagError('Either --prev-failures-file or --prev-failures-stdin is required');
        }

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

        // Require every previously-failing test to appear as an explicit pass on retry.
        // Checking for explicit passes (rather than absence of failure) guards against
        // three false-green scenarios: (a) the runner crashes before reaching the test
        // leaving an empty JUnit directory, (b) a beforeAll hook failure causes the test
        // to be reported as skipped rather than failed, and (c) stale XML files from the
        // previous attempt persist in the directory on a persistent-workspace agent.
        const currentPassed = await collectPassedTestNames(junitDir);
        const notRecovered = [...prevFailed].filter((name) => !currentPassed.has(name));

        if (notRecovered.length === 0) {
          log.success(`All ${prevFailed.size} previously-failing test(s) passed on retry`);
          return;
        }

        log.error(`${notRecovered.length} test(s) did not pass on retry:`);
        for (const name of notRecovered) {
          log.error(`  ${name}`);
        }
        process.exit(1);
      }

      throw createFlagError(
        `Unknown command: ${command}. Valid commands: snapshot, list-new-failures, list-failures, check-intersection`
      );
    },
    {
      description: `
        Utilities for evaluating FTR retry results.

        Commands:
          snapshot <junit-dir>
            Writes the current list of *.xml files in <junit-dir> to a snapshot file.
            Call this before running a config so list-new-failures can diff against it.

          list-new-failures <junit-dir>
            Reads the snapshot written by the snapshot command, diffs it against the
            current *.xml files, and prints the failing test names from new XMLs only.
            Deletes the snapshot file after reading.

          list-failures <junit-dir>
            Lists all failed test names (one per line) found in *.xml files under
            the given directory. Used to capture attempt-1 failures before retry.

          check-intersection --junit-dir <dir> --prev-failures-file <file>|--prev-failures-stdin
            Checks whether every test named in <file> (or stdin) appears as an explicit
            pass in <dir>. Exits 0 if all previously-failing tests passed (step can be
            marked green). Exits 1 if any previously-failing test did not pass
            (still failing, skipped, or absent).
      `,
      flags: {
        string: ['junit-dir', 'prev-failures-file'],
        boolean: ['prev-failures-stdin'],
        help: `
          --junit-dir              Directory containing JUnit XML files for the current attempt
          --prev-failures-file     File with newline-separated test names that failed in attempt 1
          --prev-failures-stdin    Read prev-failures from stdin instead of a file
        `,
      },
    }
  );
}
