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

import { writeFileSync } from 'fs';
import shell from 'shelljs';
import { tryCatch } from '../either';
import { id } from '../utils';

const encoding = 'utf8';
const appendUtf8 = { flag: 'a', encoding };

export const flush = (dest) => (log) => (assignments) => {
  log.verbose(`\n### Flushing assignments to: \n\t${dest}`);

  const writeToFile = writeFileSync.bind(null, dest);

  writeToFile('', { encoding });

  for (const xs of assignments) xs.forEach((x) => writeToFile(`${x}\n`, appendUtf8));

  tryCatch(() => maybeShowSize(dest)).fold(id, (x) => {
    log.verbose(`\n### Flushed [${x}] lines`);
  });
};
function maybeShowSize(x) {
  const { output } = shell.exec(`wc -l ${x}`, { silent: true });
  return output.match(/\s*\d*\s*/)[0].trim();
}
