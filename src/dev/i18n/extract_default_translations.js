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
import { formats } from '@kbn/i18n';
import JSON5 from 'json5';

import { extractHtmlMessages } from './extract_html_messages';
import { extractCodeMessages } from './extract_code_messages';
import { extractJadeMessages } from './extract_jade_messages';
import { extractHandlebarsMessages } from './extract_handlebras_messages';
import {
  globAsync,
  makeDirAsync,
  accessAsync,
  readFileAsync,
  writeFileAsync,
} from './utils';

const ESCAPE_CHARACTERS_REGEX = /\\([\s\S])|(')/g;

function addMessageToMap(targetMap, key, value) {
  const existingValue = targetMap.get(key);
  if (targetMap.has(key) && existingValue.message !== value.message) {
    throw new Error(
      `There is more than one default message for the same id "${key}": "${existingValue}" and "${value}"`
    );
  }
  targetMap.set(key, value);
}

export async function extractDefaultTranslations(inputPath) {
  const entries = await globAsync(
    '*.{js,jsx,jade,ts,tsx,html,hbs,handlebars}',
    {
      cwd: inputPath,
      matchBase: true,
    }
  );

  const { htmlEntries, codeEntries, jadeEntries, hbsEntries } = entries.reduce(
    (paths, entry) => {
      const resolvedPath = resolve(inputPath, entry);

      if (resolvedPath.endsWith('.html')) {
        paths.htmlEntries.push(resolvedPath);
      } else if (resolvedPath.endsWith('.jade')) {
        paths.jadeEntries.push(resolvedPath);
      } else if (
        resolvedPath.endsWith('.hbs') ||
        resolvedPath.endsWith('.handlebars')
      ) {
        paths.hbsFiles.push(resolvedPath);
      } else {
        paths.codeEntries.push(resolvedPath);
      }

      return paths;
    },
    { htmlEntries: [], codeEntries: [], jadeEntries: [], hbsEntries: [] }
  );

  const defaultMessagesMap = new Map();

  await Promise.all(
    [
      [htmlEntries, extractHtmlMessages],
      [codeEntries, extractCodeMessages],
      [jadeEntries, extractJadeMessages],
      [hbsEntries, extractHandlebarsMessages],
    ].map(async ([entries, extractFunction]) => {
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
          throw new Error(`Error in ${name}\n${error.message || error}`);
        }
      }
    })
  );

  let jsonBuffer = Buffer.from(
    JSON5.stringify({ formats }, { quote: `'`, space: 2 }).slice(0, -1)
  );

  const defaultMessages = [...defaultMessagesMap].sort(([key1], [key2]) => {
    return key1 < key2 ? -1 : 1;
  });

  for (const [mapKey, mapValue] of defaultMessages) {
    const key = mapKey.replace(ESCAPE_CHARACTERS_REGEX, '\\$1$2');
    const value = mapValue.message
      .replace(ESCAPE_CHARACTERS_REGEX, '\\$1$2')
      .replace('\n', '\\n');

    jsonBuffer = Buffer.concat([
      jsonBuffer,
      Buffer.from(`  '${key}': '${value}',`),
      Buffer.from(mapValue.context ? ` // ${mapValue.context}\n` : '\n'),
    ]);
  }

  jsonBuffer = Buffer.concat([jsonBuffer, Buffer.from('}\n')]);

  try {
    await accessAsync(resolve(inputPath, 'translations'));
  } catch (_) {
    await makeDirAsync(resolve(inputPath, 'translations'));
  }

  await writeFileAsync(
    resolve(inputPath, 'translations', 'en.json'),
    jsonBuffer
  );
}
