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

const SNAPSHOT_FILE = '.ftr_annotation_snapshot';

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
 * Reads the snapshot written by snapshotJunitDir, diffs against the current XML files,
 * and returns the failing test names from XMLs produced after the snapshot.
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

export function runAnnotationHelperCli() {
  run(
    async ({ flags }) => {
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

      throw createFlagError(
        `Unknown command: ${command}. Valid commands: snapshot, list-new-failures`
      );
    },
    {
      description: `
        Per-config JUnit attribution helpers for FTR job annotations.

        Commands:
          snapshot <junit-dir>
            Writes the current list of *.xml files in <junit-dir> to a snapshot file.
            Call this before running a config.

          list-new-failures <junit-dir>
            Diffs the current *.xml files against the snapshot and prints failing test
            names from XMLs that are new since the snapshot. Deletes the snapshot file.
      `,
    }
  );
}
