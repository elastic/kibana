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
  readFileAsync,
  writeFileAsync,
  accessAsync,
  makeDirAsync,
  normalizePath,
  ErrorReporter,
} from './utils';
import { paths, exclude } from '../../../.i18nrc.json';
import { getDefaultMessagesMap } from './extract_default_translations';
import { createFailError } from '../run';
import { serializeToJson } from './serializers/json';

export function verifyMessages(localizedMessagesMap, defaultMessagesMap) {
  let errorMessage = '';

  const defaultMessagesIds = [...defaultMessagesMap.keys()];
  const localizedMessagesIds = [...localizedMessagesMap.keys()];

  const unusedTranslations = difference(localizedMessagesIds, defaultMessagesIds);
  if (unusedTranslations.length > 0) {
    errorMessage += `\nUnused translations:\n${unusedTranslations.join(', ')}`;
  }

  const missingTranslations = difference(defaultMessagesIds, localizedMessagesIds);
  if (missingTranslations.length > 0) {
    errorMessage += `\nMissing translations:\n${missingTranslations.join(', ')}`;
  }

  if (errorMessage) {
    throw createFailError(errorMessage);
  }
}

function groupMessagesByNamespace(localizedMessagesMap) {
  const localizedMessagesByNamespace = new Map();
  const knownNamespaces = Object.keys(paths);

  for (const [messageId, messageValue] of localizedMessagesMap) {
    const namespace = knownNamespaces.find(key => messageId.startsWith(`${key}.`));

    if (!namespace) {
      throw createFailError(`Unknown namespace in id ${messageId}.`);
    }

    if (!localizedMessagesByNamespace.has(namespace)) {
      localizedMessagesByNamespace.set(namespace, []);
    }

    localizedMessagesByNamespace
      .get(namespace)
      .push([messageId, { message: messageValue.text || messageValue }]);
  }

  return localizedMessagesByNamespace;
}

async function writeMessages(localizedMessagesByNamespace, fileName, formats, log) {
  for (const [namespace, messages] of localizedMessagesByNamespace) {
    const destPath = path.resolve(paths[namespace], 'translations');

    try {
      await accessAsync(destPath);
    } catch (_) {
      await makeDirAsync(destPath);
    }

    const writePath = path.resolve(destPath, fileName);
    await writeFileAsync(writePath, serializeToJson(messages, formats));
    log.success(`Translations have been integrated to ${normalizePath(writePath)}`);
  }
}

export async function integrateLocaleFiles(filePath, log) {
  const reporter = new ErrorReporter();
  const defaultMessagesMap = await getDefaultMessagesMap(['.'], { paths, exclude }, reporter);
  const localizedMessages = JSON.parse((await readFileAsync(filePath)).toString());

  if (!localizedMessages.formats) {
    throw createFailError(`Locale file should contain formats object.`);
  }

  const localizedMessagesMap = new Map(Object.entries(localizedMessages.messages));
  verifyMessages(localizedMessagesMap, defaultMessagesMap);

  // use basename of filePath to write the same locale name as the source file has
  const fileName = path.basename(filePath);
  const localizedMessagesByNamespace = groupMessagesByNamespace(localizedMessagesMap);
  await writeMessages(localizedMessagesByNamespace, fileName, localizedMessages.formats, log);
}
