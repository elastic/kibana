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

import { resolve as resolvePath } from 'path';

import { extractHtmlMessages } from './extract_html_messages';
import { extractCodeMessages } from './extract_code_messages';
import {
  globAsync,
  makeDirAsync,
  writeFileAsync,
  pathExists,
  readFileAsync,
} from './utils';

function addMessageToMap(targetMap, key, value) {
  if (targetMap.has(key) && targetMap.get(key) !== value) {
    throw new Error(`Default messages are different for id "${key}"`);
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

    nestedObject[messageId] = mapValue;
  }

  return result;
}

export async function extractDefaultTranslations(inputPath) {
  const entries = await globAsync('*.{js,jsx,ts,tsx,html}', {
    cwd: inputPath,
    matchBase: true,
  });

  const { htmlEntries, codeEntries } = entries.reduce(
    (paths, entry) => {
      const resolvedPath = resolvePath(inputPath, entry);

      if (resolvedPath.endsWith('.html')) {
        paths.htmlEntries.push(resolvedPath);
      } else {
        paths.codeEntries.push(resolvedPath);
      }

      return paths;
    },
    { htmlEntries: [], codeEntries: [] }
  );

  const defaultMessagesMap = new Map();

  // If some file contains an error, we cannot handle it until all files are read.
  // TODO: move files reading to "extract*" async generators after async iterators implementation (for-await-of syntax)
  // to get rid of Promise.all().
  // Run NodeJS with --harmony-async-iteration flag to use async iterators in NodeJS 8 or wait for NodeJS 10 LTS

  const htmlFiles = await Promise.all(
    htmlEntries.map(entry => {
      return readFileAsync(entry).then(buffer => ({
        name: entry,
        content: buffer.toString(),
      }));
    })
  );

  for (const [id, value] of extractHtmlMessages(htmlFiles)) {
    addMessageToMap(defaultMessagesMap, id, value);
  }

  const codeFiles = await Promise.all(
    codeEntries.map(entry => {
      return readFileAsync(entry).then(buffer => ({
        name: entry,
        content: buffer.toString(),
      }));
    })
  );

  for (const [id, value] of extractCodeMessages(codeFiles)) {
    addMessageToMap(defaultMessagesMap, id, value);
  }

  const defaultMessages = buildDefaultMessagesObject(defaultMessagesMap);

  try {
    await pathExists(resolvePath(inputPath, 'translations'));
  } catch (_) {
    await makeDirAsync(resolvePath(inputPath, 'translations'));
  }

  await writeFileAsync(
    resolvePath(inputPath, 'translations/defaultMessages.json'),
    JSON.stringify(defaultMessages, null, 2)
  );
}
