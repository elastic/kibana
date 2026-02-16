/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

import getopts from 'getopts';
import dedent from 'dedent';
import { REPO_ROOT } from '@kbn/repo-info';
import { ToolingLog, pickLevelFromFlags } from '@kbn/tooling-log';

import {
  generateNoticeFromSource,
  checkFilesForNoticeComments,
} from './generate_notice_from_source';

const unknownFlags = [];
const opts = getopts(process.argv.slice(2), {
  boolean: ['help', 'validate', 'verbose', 'debug'],
  string: ['files'],
  unknown(flag) {
    unknownFlags.push(flag);
  },
});

const log = new ToolingLog({
  level: pickLevelFromFlags(opts),
  writeTo: process.stdout,
});

if (unknownFlags.length) {
  log.error(`Unknown flags ${unknownFlags.map((f) => `"${f}"`).join(',')}`);
  process.exitCode = 1;
  opts.help = true;
}

if (opts.help) {
  process.stdout.write(
    '\n' +
      dedent`
    Generate or validate NOTICE.txt.

      Entries are collected by finding all multi-line comments that start
      with a "@notice" tag and copying their text content into NOTICE.txt.

    Options:
      --help      Show this help info
      --validate  Don't write the NOTICE.txt, just fail if updates would have been made
      --files     Comma-separated list of files to check for @notice comments.
                  If provided and none contain @notice, the full scan is skipped.
      --verbose   Set logging level to verbose
      --debug     Set logging level to debug
  ` +
      '\n\n'
  );
  process.exit();
}

(async function run() {
  // If specific files are provided, first check if any contain @notice comments
  // If none do, we can skip the full scan since NOTICE.txt wouldn't change
  if (opts.files) {
    const filesToCheck = opts.files.split(',').filter(Boolean);
    if (filesToCheck.length > 0) {
      log.info(`Checking ${filesToCheck.length} file(s) for @notice comments...`);
      const hasNoticeComments = await checkFilesForNoticeComments(filesToCheck, log);
      if (!hasNoticeComments) {
        log.success('No @notice comments in changed files. NOTICE.txt check skipped.');
        return;
      }
      log.info('Found @notice comments in changed files. Running full NOTICE.txt validation...');
    }
  }

  const path = resolve(REPO_ROOT, 'NOTICE.txt');
  const newContent = await generateNoticeFromSource({
    productName: 'Kibana source code with Kibana X-Pack source code',
    directory: REPO_ROOT,
    log,
  });

  const currentContent = readFileSync(path, 'utf8');
  if (currentContent === newContent) {
    log.success('NOTICE.txt is up to date');
    return;
  }

  if (!opts.validate) {
    log.success('Wrote notice text to NOTICE.txt');
    writeFileSync(path, newContent, 'utf8');
    return;
  }

  log.error(
    'NOTICE.txt is out of date, run `node scripts/notice` to update and commit the results.'
  );
  process.exit(1);
})().catch((error) => {
  log.error(error);
  process.exit(1);
});
