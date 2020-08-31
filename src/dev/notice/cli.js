/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

import getopts from 'getopts';
import dedent from 'dedent';
import { ToolingLog, pickLevelFromFlags } from '@kbn/dev-utils';

import { REPO_ROOT } from '../constants';
import { generateNoticeFromSource } from './generate_notice_from_source';

const unknownFlags = [];
const opts = getopts(process.argv.slice(2), {
  boolean: ['help', 'validate', 'verbose', 'debug'],
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
      --verbose   Set logging level to verbose
      --debug     Set logging level to debug
  ` +
      '\n\n'
  );
  process.exit();
}

(async function run() {
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
