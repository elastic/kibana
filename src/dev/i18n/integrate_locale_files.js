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

import path from 'path';

import { difference, globAsync, normalizePath, readFileAsync, writeFileAsync } from './utils';
import { paths } from '../../../.i18nrc.json';

export function verifyMessages(localeMessages, defaultMessagesMap) {
  let errorMessage = '';

  const defaultMessagesIds = [...defaultMessagesMap.keys()];
  const localeMessagesIds = Object.keys(localeMessages).filter(id => id !== 'formats');

  const unusedTranslations = difference(localeMessagesIds, defaultMessagesIds);
  const missingTranslations = difference(defaultMessagesIds, localeMessagesIds);

  if (unusedTranslations.length > 0) {
    errorMessage += `\nUnused translations:\n${unusedTranslations.join(', ')}`;
  }

  if (missingTranslations.length > 0) {
    errorMessage += `\nMissing translations:\n${missingTranslations.join(', ')}`;
  }

  if (errorMessage) {
    throw new Error(errorMessage);
  }
}

export async function integrateLocaleFiles(localesPath, defaultMessagesMap) {
  const globOptions = {
    cwd: path.resolve(localesPath),
  };

  const localeEntries = await globAsync('./*.json', globOptions);

  for (const entry of localeEntries.map(entry => path.resolve(localesPath, entry))) {
    const localeMessages = JSON.parse((await readFileAsync(entry)).toString());

    if (!localeMessages.formats) {
      throw 'Locale file should contain formats object.';
    }

    try {
      verifyMessages(localeMessages, defaultMessagesMap);
    } catch (error) {
      throw new Error(`Error in ${normalizePath(entry)}:
${error.message || error}`);
    }

    const fileName = path.basename(entry);
    const messagesByPluginMap = new Map();
    const messagesEntries = Object.entries(localeMessages).filter(([id]) => id !== 'formats');

    for (const [messageId, messageValue] of messagesEntries) {
      const namespace = Object.keys(paths).find(key => messageId.startsWith(`${key}.`));

      if (!namespace) {
        throw new Error(`Unknown namespace in id ${messageId} in ${normalizePath(entry)}.`);
      }

      if (messagesByPluginMap.has(namespace)) {
        messagesByPluginMap.get(namespace)[messageId] = messageValue;
      } else {
        messagesByPluginMap.set(namespace, {
          formats: localeMessages.formats,
          [messageId]: messageValue,
        });
      }
    }

    for (const [namespace, messages] of messagesByPluginMap) {
      const pluginPath = paths[namespace];

      await writeFileAsync(
        path.resolve(pluginPath, 'translations', fileName),
        JSON.stringify(messages, undefined, 2)
      );
    }
  }
}
