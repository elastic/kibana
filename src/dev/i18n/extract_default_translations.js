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
import { i18n } from '@kbn/i18n';
import JSON5 from 'json5';
import normalize from 'normalize-path';

import { extractHtmlMessages } from './extract_html_messages';
import { extractCodeMessages } from './extract_code_messages';
import { extractPugMessages } from './extract_pug_messages';
import { extractHandlebarsMessages } from './extract_handlebars_messages';
import { globAsync, readFileAsync, writeFileAsync } from './utils';
import { paths, exclude } from '../../../.i18nrc.json';

const ESCAPE_SINGLE_QUOTE_REGEX = /\\([\s\S])|(')/g;

function addMessageToMap(targetMap, key, value) {
  const existingValue = targetMap.get(key);
  if (targetMap.has(key) && existingValue.message !== value.message) {
    throw new Error(
      `There is more than one default message for the same id "${key}": \
"${existingValue.message}" and "${value.message}"`
    );
  }
  targetMap.set(key, value);
}

function filterPaths(inputPaths) {
  const availablePaths = Object.values(paths);
  const pathsForExtraction = new Set();

  for (const inputPath of inputPaths) {
    const normalizedPath = normalize(path.relative('.', inputPath));

    if (normalizedPath) {
      availablePaths
        .filter(ePath => ePath.startsWith(`${normalizedPath}/`) || ePath === normalizedPath)
        .forEach(ePath => pathsForExtraction.add(ePath));
    } else {
      availablePaths.forEach(ePath => pathsForExtraction.add(ePath));
    }

    if (
      availablePaths.some(
        ePath => normalizedPath.startsWith(`${ePath}/`) || ePath === normalizedPath
      )
    ) {
      pathsForExtraction.add(normalizedPath);
    }
  }

  return [...pathsForExtraction];
}

export function validateMessageNamespace(id, filePath) {
  const normalizedPath = normalize(path.relative('.', filePath));

  const [expectedNamespace] = Object.entries(paths).find(([, pluginPath]) =>
    normalizedPath.startsWith(`${pluginPath}/`)
  );

  if (!id.startsWith(`${expectedNamespace}.`)) {
    throw new Error(`Expected "${id}" id to have "${expectedNamespace}" namespace. \
See i18nrc.json for the list of supported namespaces.`);
  }
}

export async function extractMessagesFromPathToMap(inputPath, targetMap) {
  const entries = await globAsync('*.{js,jsx,pug,ts,tsx,html,hbs,handlebars}', {
    cwd: inputPath,
    matchBase: true,
  });

  const { htmlEntries, codeEntries, pugEntries, hbsEntries } = entries.reduce(
    (paths, entry) => {
      const resolvedPath = path.resolve(inputPath, entry);

      if (resolvedPath.endsWith('.html')) {
        paths.htmlEntries.push(resolvedPath);
      } else if (resolvedPath.endsWith('.pug')) {
        paths.pugEntries.push(resolvedPath);
      } else if (resolvedPath.endsWith('.hbs') || resolvedPath.endsWith('.handlebars')) {
        paths.hbsEntries.push(resolvedPath);
      } else {
        paths.codeEntries.push(resolvedPath);
      }

      return paths;
    },
    { htmlEntries: [], codeEntries: [], pugEntries: [], hbsEntries: [] }
  );

  await Promise.all(
    [
      [htmlEntries, extractHtmlMessages],
      [codeEntries, extractCodeMessages],
      [pugEntries, extractPugMessages],
      [hbsEntries, extractHandlebarsMessages],
    ].map(async ([entries, extractFunction]) => {
      const files = await Promise.all(
        entries
          .filter(entry => !exclude.includes(normalize(path.relative('.', entry))))
          .map(async entry => {
            return {
              name: entry,
              content: await readFileAsync(entry),
            };
          })
      );

      for (const { name, content } of files) {
        try {
          for (const [id, value] of extractFunction(content)) {
            validateMessageNamespace(id, name);
            addMessageToMap(targetMap, id, value);
          }
        } catch (error) {
          throw new Error(`Error in ${name}\n${error.message || error}`);
        }
      }
    })
  );
}

export async function extractDefaultTranslations({ paths, output, outputFormat }) {
  const defaultMessagesMap = new Map();

  for (const inputPath of filterPaths(paths)) {
    await extractMessagesFromPathToMap(inputPath, defaultMessagesMap);
  }

  // messages shouldn't be extracted to a file if output is not supplied
  if (!output || !defaultMessagesMap.size) {
    return;
  }

  const defaultMessages = [...defaultMessagesMap].sort(([key1], [key2]) => {
    return key1 < key2 ? -1 : 1;
  });

  const defaultMessagesObject = { formats: i18n.formats };

  if (outputFormat === 'json5') {
    // .slice(0, -1): remove closing curly brace from json to append messages
    let jsonBuffer = Buffer.from(
      JSON5.stringify(defaultMessagesObject, { quote: `'`, space: 2 }).slice(0, -1)
    );

    for (const [mapKey, mapValue] of defaultMessages) {
      const formattedMessage = mapValue.message.replace(ESCAPE_SINGLE_QUOTE_REGEX, '\\$1$2');
      const formattedContext = mapValue.context
        ? mapValue.context.replace(ESCAPE_SINGLE_QUOTE_REGEX, '\\$1$2')
        : '';

      jsonBuffer = Buffer.concat([
        jsonBuffer,
        Buffer.from(`  '${mapKey}': '${formattedMessage}',`),
        Buffer.from(formattedContext ? ` // ${formattedContext}\n` : '\n'),
      ]);
    }

    // append previously removed closing curly brace
    jsonBuffer = Buffer.concat([jsonBuffer, Buffer.from('}\n')]);

    await writeFileAsync(path.resolve(output, 'en.json'), jsonBuffer);
  } else {
    for (const [mapKey, mapValue] of defaultMessages) {
      if (mapValue.context) {
        defaultMessagesObject[mapKey] = { message: mapValue.message, context: mapValue.context };
      } else {
        defaultMessagesObject[mapKey] = mapValue.message;
      }
    }

    await writeFileAsync(
      path.resolve(output, 'en.json'),
      JSON.stringify(defaultMessagesObject, undefined, 2)
    );
  }
}
