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

import { createWriteStream, PathLike, WriteStream } from 'fs';
import { ToolingLog } from '../tooling_log';

const preamble = `# GitHub CODEOWNERS definition
# Identify which groups will be pinged by changes to different parts of the codebase.
# For more info, see https://help.github.com/articles/about-codeowners/\n\n`;

export const flush = (codeOwnersPath: PathLike) => (log: ToolingLog) => (ownersMap: any) => {
  const file: WriteStream = createWriteStream(codeOwnersPath);
  file.write(preamble);
  const recordToFile = record(file)(log);

  interface OwnerRecord {
    owners: [];
  }
  ownersMap.forEach(({ owners }: OwnerRecord, key: string) => {
    const flat = owners.join(' ');
    const item = `${key} ${flat}\n`;
    if (owners.length) recordToFile(item);
  });

  file.end();

  log.info(`\n### Data written to codeOwnersPath: \n\t${codeOwnersPath}`);
};

function record(file: WriteStream) {
  return (log: ToolingLog) => (item: string) => file.write(item) && log.debug(item);
}
