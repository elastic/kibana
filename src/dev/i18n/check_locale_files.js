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
import JSON5 from 'json5';

import { arraysDiff, globAsync, plainify, readFileAsync } from './utils';
import { verifyJSON } from './verify_locale_json';

async function checkFile(localePath) {
  let errorMessage = '';

  const defaultMessagesBuffer = await readFileAsync(
    path.resolve(path.dirname(localePath), 'defaultMessages.json')
  );
  const defaultMessagesIds = Object.keys(
    JSON.parse(defaultMessagesBuffer.toString())
  );

  const localeBuffer = await readFileAsync(localePath);

  const namespace = verifyJSON(localeBuffer.toString(), localePath);

  const translations = JSON5.parse(localeBuffer.toString());
  const translationsIds = Object.keys(plainify(translations));

  const [unusedTranslations, missingTranslations] = arraysDiff(
    translationsIds,
    defaultMessagesIds
  );

  if (unusedTranslations.length > 0) {
    errorMessage += `\nThere are unused translations in locale file ${localePath}:
${unusedTranslations.join(', ')}`;
  }

  if (missingTranslations.length > 0) {
    errorMessage += `\nThere are missing translations in locale file ${localePath}:
${missingTranslations.join(', ')}`;
  }

  if (errorMessage) {
    throw new Error(errorMessage);
  }

  return namespace;
}

export async function checkLocaleFiles(pluginsPaths) {
  const pluginsMapByLocale = new Map();

  for (const pluginPath of pluginsPaths) {
    const globOptions = {
      ignore: [
        './translations/defaultMessages.json',
        './translations/messagesCache.json',
      ],
      cwd: path.resolve(pluginPath),
    };

    const localeEntries = await globAsync('./translations/*.json', globOptions);

    for (const entry of localeEntries) {
      const locale = path.basename(entry);

      if (pluginsMapByLocale.has(locale)) {
        pluginsMapByLocale.get(locale).push(pluginPath);
      } else {
        pluginsMapByLocale.set(locale, [pluginPath]);
      }
    }
  }

  for (const locale of pluginsMapByLocale.keys()) {
    const namespaces = [];
    for (const pluginPath of pluginsMapByLocale.get(locale)) {
      const namespace = await checkFile(
        path.resolve(pluginPath, 'translations', locale)
      );
      if (namespaces.includes(namespace)) {
        throw new Error(
          `Error in ${pluginPath} plugin ${locale} locale file\nLocale file namespace should be unique for each plugin`
        );
      }
      namespaces.push(namespace);
    }
  }
}
