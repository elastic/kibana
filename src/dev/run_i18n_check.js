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

import chalk from 'chalk';
import Listr from 'listr';
import execa from 'execa';
import readline from 'readline';
import { resolve } from 'path';

import { run, createFailError } from './run';
import { extractDefaultTranslations, filterPaths } from './i18n/extract_default_translations';
import { writeFileAsync } from './i18n/utils';
import { serializeToJson, serializeToJson5 } from './i18n/serializers';

run(async ({ flags: { path, output, 'output-format': outputFormat } }) => {
  const paths = Array.isArray(path) ? path : [path || './'];
  const filteredPaths = filterPaths(paths);

  if (filteredPaths.length === 0) {
    throw createFailError(
      `${chalk.white.bgRed(' I18N ERROR ')} \
None of input paths is available for extraction or validation. See .i18nrc.json.`
    );
  }

  if (filteredPaths.length === 1) {
    await extractDefaultTranslations(filteredPaths[0]);
  } else {
    const list = new Listr(
      filteredPaths.map(filteredPath => ({
        task: messages => {
          const child = execa('node', ['scripts/i18n_check', '--path', filteredPath], {
            env: chalk.enabled ? { FORCE_COLOR: 'true' } : {},
          });

          readline.createInterface({ input: child.stdout }).on('line', buffer => {
            messages.push(JSON.parse(buffer.toString()));
          });

          return child;
        },
        title: filteredPath,
      })),
      { concurrent: 5 }
    );

    const messages = await list.run([]);
    if (!output || !messages.size) {
      return;
    }

    const sortedMessages = [...messages].sort(([key1], [key2]) => key1.localeCompare(key2));

    await writeFileAsync(
      resolve(output, 'en.json'),
      outputFormat === 'json5' ? serializeToJson5(sortedMessages) : serializeToJson(sortedMessages)
    );
  }
});
