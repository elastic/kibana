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

import { createWriteStream } from 'fs';

const preamble = `# GitHub CODEOWNERS definition
# Identify which groups will be pinged by changes to different parts of the codebase.
# For more info, see https://help.github.com/articles/about-codeowners/\n\n`;

export const flush = (codeOwnersPath) => (log) => (ownersMap) => {
  log.info(`\n### Flushing to codeOwnersPath: \n\t${codeOwnersPath}`);
  const file = createWriteStream(codeOwnersPath);

  file.write(preamble);

  ownersMap.forEach(({ owners /* review, teams */ }, key) => {
    file.write(`${key} ${owners.join(' ')}\n`);
  });

  file.end();
};
