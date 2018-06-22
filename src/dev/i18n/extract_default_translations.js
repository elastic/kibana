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

import { resolve } from 'path';
import JSON5 from 'json5';

import { extractHtmlMessages } from './extract_html_messages';
import { extractCodeMessages } from './extract_code_messages';
import { extractJadeMessages } from './extract_jade_messages';
import { writeContextToJSON } from './write_context_comments';
import {
  globAsync,
  makeDirAsync,
  pathExists,
  readFileAsync,
  throwEntryException,
} from './utils';

function addMessageToMap(targetMap, key, value) {
  const existingValue = targetMap.get(key);
  if (targetMap.has(key) && existingValue.message !== value.message) {
    throw new Error(
      `There is more than one default message for the same id "${key}": "${existingValue}" and "${value}"`
    );
  }
  targetMap.set(key, value);
}

function buildDefaultMessagesObject(map) {
  const result = {};
  let nestedObject;
  let keysChain;
  let messageId;

  for (const [mapKey, mapValue] of map) {
    if (!mapKey.includes('.')) {
      throw new Error(`Wrong message id: "${mapKey}". Namespace is required`);
    }

    nestedObject = result;
    keysChain = mapKey.split('.');
    messageId = keysChain.pop();

    for (const key of keysChain) {
      if (!Object.keys(nestedObject).includes(key)) {
        nestedObject[key] = {};
      }

      nestedObject = nestedObject[key];

      if (typeof nestedObject !== 'object') {
        throw new Error(
          `Ids collision. ${key} in ${mapKey} is a message, not a namespace.`
        );
      }
    }

    if (typeof nestedObject[messageId] === 'object') {
      throw new Error(
        `Ids collision. ${messageId} in ${mapKey} is a namespace. Cannot override with a message.`
      );
    }

    nestedObject[messageId] = mapValue.message;
  }

  return result;
}

export async function extractDefaultTranslations(inputPath) {
  const entries = await globAsync('*.{js,jsx,jade,ts,tsx,html}', {
    cwd: inputPath,
    matchBase: true,
  });

  const { htmlEntries, codeEntries, jadeEntries } = entries.reduce(
    (paths, entry) => {
      const resolvedPath = resolve(inputPath, entry);

      if (resolvedPath.endsWith('.html')) {
        paths.htmlEntries.push(resolvedPath);
      } else if (resolvedPath.endsWith('.jade')) {
        paths.jadeEntries.push(resolvedPath);
      } else {
        paths.codeEntries.push(resolvedPath);
      }

      return paths;
    },
    { htmlEntries: [], codeEntries: [], jadeEntries: [] }
  );

  const defaultMessagesMap = new Map();

  await Promise.all(
    [
      [htmlEntries, extractHtmlMessages],
      [codeEntries, extractCodeMessages],
      [jadeEntries, extractJadeMessages],
    ].map(async ([entries, extractFunction]) => {
      // If some file contains an error, we cannot handle it until all files are read.
      // TODO: move files reading to "extract*" async generators after async iterators implementation (for-await-of syntax)
      // to get rid of Promise.all().

      const files = await Promise.all(
        entries.map(async entry => {
          return {
            name: entry,
            content: await readFileAsync(entry),
          };
        })
      );

      for (const { name, content } of files) {
        try {
          for (const [id, value] of extractFunction(content)) {
            addMessageToMap(defaultMessagesMap, id, value);
          }
        } catch (error) {
          throwEntryException(error, name);
        }
      }
    })
  );

  const defaultMessages = buildDefaultMessagesObject(defaultMessagesMap);

  try {
    await pathExists(resolve(inputPath, 'translations'));
  } catch (_) {
    await makeDirAsync(resolve(inputPath, 'translations'));
  }

  const defaultMessagesJSON = JSON5.stringify(defaultMessages, {
    space: 2,
    quote: `'`,
  }).concat('\n');

  await writeContextToJSON(inputPath, defaultMessagesJSON, defaultMessagesMap);
}
