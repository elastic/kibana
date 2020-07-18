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

import vfs from 'vinyl-fs';
import { ToolingLog } from '@kbn/dev-utils';

const NOTICE_COMMENT_RE = /\/\*[\s\n\*]*@notice([\w\W]+?)\*\//g;
const NEWLINE_RE = /\r?\n/g;

interface Options {
  /**
   * Name to print at the top of the notice
   */
  productName: string;
  /**
   * absolute path to the repo to search for @notice comments
   */
  directory: string;
  log: ToolingLog;
}

/**
 * Generates the text for the NOTICE.txt file at the root of the
 * repo which details the licenses for code that is copied/vendored
 * into the repository.
 */
export async function generateNoticeFromSource({ productName, directory, log }: Options) {
  const globs = ['**/*.{js,less,css,ts}'];

  const options = {
    cwd: directory,
    nodir: true,
    ignore: [
      '{node_modules,build,dist,data,built_assets}/**',
      'packages/*/{node_modules,build,dist}/**',
      'x-pack/{node_modules,build,dist,data}/**',
      'x-pack/packages/*/{node_modules,build,dist}/**',
      '**/target/**',
    ],
  };

  log.debug('vfs.src globs', globs);
  log.debug('vfs.src options', options);
  log.info(`Searching ${directory} for multi-line comments starting with @notice`);

  const files = vfs.src(globs, options);
  const noticeComments: string[] = [];
  await new Promise((resolve, reject) => {
    files
      .on('data', (file) => {
        log.verbose(`Checking for @notice comments in ${file.relative}`);

        const source = file.contents.toString('utf8');
        let match;
        while ((match = NOTICE_COMMENT_RE.exec(source)) !== null) {
          log.info(`Found @notice comment in ${file.relative}`);
          if (!noticeComments.includes(match[1])) {
            noticeComments.push(match[1]);
          }
        }
      })
      .on('error', reject)
      .on('end', resolve);
  });

  let noticeText = '';
  noticeText += `${productName}\n`;
  noticeText += `Copyright 2012-${new Date().getUTCFullYear()} Elasticsearch B.V.\n`;

  for (const comment of noticeComments.sort()) {
    noticeText += '\n---\n';
    noticeText += comment
      .split(NEWLINE_RE)
      .map((line) =>
        line
          // trim whitespace
          .trim()
          // trim leading * and a single space
          .replace(/(^\* ?)/, '')
      )
      .join('\n')
      .trim();
    noticeText += '\n';
  }

  noticeText += '\n';

  log.debug(`notice text:\n\n${noticeText}`);
  return noticeText;
}
