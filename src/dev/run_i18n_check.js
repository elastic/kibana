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
import { resolve } from 'path';

import { run, createFailError } from './run';
import config from '../../.i18nrc.json';
import {
  filterPaths,
  extractMessagesFromPathToMap,
  writeFileAsync,
  serializeToJson,
  serializeToJson5,
} from './i18n/';

run(async ({ flags: { path, output, 'output-format': outputFormat, include = [], exclude } }) => {
  const paths = Array.isArray(path) ? path : [path || './'];
  const additionalPluginsPaths = Array.isArray(include) ? include : [include];

  const configWithAdditionalPlugins = {
    paths: {
      ...config.paths,
      ...additionalPluginsPaths.reduce((pairs, pair) => {
        const parsedPair = pair.split(':');
        const [namespace, path] = parsedPair;

        if (parsedPair.length !== 2) {
          throw createFailError(
            `${chalk.white.bgRed(' I18N ERROR ')} Cannot parse '--include ${pair}'`
          );
        }

        pairs[namespace] = path;
        return pairs;
      }, {}),
    },
    exclude: config.exclude.concat(exclude || []),
  };

  const filteredPaths = filterPaths(paths, configWithAdditionalPlugins);

  if (filteredPaths.length === 0) {
    throw createFailError(
      `${chalk.white.bgRed(' I18N ERROR ')} \
None of input paths is available for extraction or validation. See .i18nrc.json.`
    );
  }

  const list = new Listr(
    filteredPaths.map(filteredPath => ({
      task: messages =>
        extractMessagesFromPathToMap(filteredPath, messages, configWithAdditionalPlugins),
      title: filteredPath,
    }))
  );

  // messages shouldn't be extracted to a file if output is not supplied
  const messages = await list.run(new Map());
  if (!output || !messages.size) {
    return;
  }

  const sortedMessages = [...messages].sort(([key1], [key2]) => key1.localeCompare(key2));
  await writeFileAsync(
    resolve(output, 'en.json'),
    outputFormat === 'json5' ? serializeToJson5(sortedMessages) : serializeToJson(sortedMessages)
  );
});
