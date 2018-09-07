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

import {
  difference,
  globAsync,
  normalizePath,
  readFileAsync,
  writeFileAsync,
  accessAsync,
  makeDirAsync,
} from './utils';
import { paths } from '../../../.i18nrc.json';
import { getDefaultMessagesMap } from './extract_default_translations';

export function verifyMessages(localizedMessagesMap, defaultMessagesMap, filePath) {
  let errorMessage = '';

  const defaultMessagesIds = [...defaultMessagesMap.keys()];
  const localizedMessagesIds = [...localizedMessagesMap.keys()];

  const unusedTranslations = difference(localizedMessagesIds, defaultMessagesIds);
  const missingTranslations = difference(defaultMessagesIds, localizedMessagesIds);

  if (unusedTranslations.length > 0) {
    errorMessage += `\nUnused translations:\n${unusedTranslations.join(', ')}`;
  }

  if (missingTranslations.length > 0) {
    errorMessage += `\nMissing translations:\n${missingTranslations.join(', ')}`;
  }

  if (errorMessage) {
    throw new Error(`Error in ${filePath}:${errorMessage}.`);
  }
}

export async function integrateLocaleFiles(localesPath) {
  const defaultMessagesMap = await getDefaultMessagesMap(['.']);
  const globOptions = {
    cwd: path.resolve(localesPath),
  };

  const filePaths = (await globAsync('./*.json', globOptions)).map(filePath =>
    path.resolve(localesPath, filePath)
  );

  for (const filePath of filePaths) {
    const normalizedFilePath = normalizePath(filePath);
    const localizedMessages = JSON.parse((await readFileAsync(filePath)).toString());

    if (!localizedMessages.formats) {
      throw new Error(
        `Error in ${normalizedFilePath}:\nLocale file should contain formats object.`
      );
    }

    const localizedMessagesMap = new Map(
      Object.entries(localizedMessages).filter(([key]) => key !== 'formats')
    );

    verifyMessages(localizedMessagesMap, defaultMessagesMap, normalizedFilePath);

    const localizedMessagesByNamespace = new Map();
    const knownNamespaces = Object.keys(paths);

    for (const [messageId, messageValue] of localizedMessagesMap) {
      const namespace = knownNamespaces.find(key => messageId.startsWith(`${key}.`));

      if (!namespace) {
        throw new Error(`Error in ${normalizedFilePath}:\nUnknown namespace in id ${messageId}.`);
      }

      if (!localizedMessagesByNamespace.has(namespace)) {
        localizedMessagesByNamespace.set(namespace, {
          formats: localizedMessages.formats,
        });
      }

      localizedMessagesByNamespace.get(namespace)[messageId] = messageValue;
    }

    for (const [namespace, messages] of localizedMessagesByNamespace) {
      const destPath = paths[namespace];
      try {
        await accessAsync(path.resolve(destPath, 'translations'));
      } catch (_) {
        await makeDirAsync(path.resolve(destPath, 'translations'));
      }

      await writeFileAsync(
        path.resolve(destPath, 'translations', path.basename(filePath)),
        JSON.stringify(messages, undefined, 2)
      );
    }
  }
}
