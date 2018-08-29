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
import normalize from 'normalize-path';
import chalk from 'chalk';

import {
  extractHtmlMessages,
  extractCodeMessages,
  extractPugMessages,
  extractHandlebarsMessages,
} from './extractors';
import { globAsync, readFileAsync, writeFileAsync } from './utils';
import { paths, exclude } from '../../../.i18nrc.json';
import { createFailError } from '../run';
import { serializeToJson, serializeToJson5 } from './serializers';

function addMessageToMap(targetMap, key, value) {
  const existingValue = targetMap.get(key);
  if (targetMap.has(key) && existingValue.message !== value.message) {
    throw createFailError(`${chalk.white.bgRed(' I18N ERROR ')} \
There is more than one default message for the same id "${key}":
"${existingValue.message}" and "${value.message}"`);
  }
  targetMap.set(key, value);
}

function normalizePath(inputPath) {
  return normalize(path.relative('.', inputPath));
}

export function filterPaths(inputPaths) {
  const availablePaths = Object.values(paths);
  const pathsForExtraction = new Set();

  for (const inputPath of inputPaths) {
    const normalizedPath = normalizePath(inputPath);

    // If input path is the sub path of or equal to any available path, include it.
    if (
      availablePaths.some(path => normalizedPath.startsWith(`${path}/`) || path === normalizedPath)
    ) {
      pathsForExtraction.add(normalizedPath);
    } else {
      // Otherwise go through all available paths and see if any of them is the sub
      // path of the input path (empty normalized path corresponds to root or above).
      availablePaths
        .filter(path => !normalizedPath || path.startsWith(`${normalizedPath}/`))
        .forEach(ePath => pathsForExtraction.add(ePath));
    }
  }

  return [...pathsForExtraction];
}

export function validateMessageNamespace(id, filePath) {
  const normalizedPath = normalizePath(filePath);

  const [expectedNamespace] = Object.entries(paths).find(([, pluginPath]) =>
    normalizedPath.startsWith(`${pluginPath}/`)
  );

  if (!id.startsWith(`${expectedNamespace}.`)) {
    throw createFailError(`${chalk.white.bgRed(' I18N ERROR ')} \
Expected "${id}" id to have "${expectedNamespace}" namespace. \
See .i18nrc.json for the list of supported namespaces.`);
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
        entries.filter(entry => !exclude.includes(normalizePath(entry))).map(async entry => {
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
          throw createFailError(
            `${chalk.white.bgRed(' I18N ERROR ')} Error in ${normalizePath(name)}\n${error}`
          );
        }
      }
    })
  );
}

export async function validateDefaultMessages(inputPath) {
  await extractMessagesFromPathToMap(inputPath, new Map());
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

  const defaultMessages = [...defaultMessagesMap].sort(([key1], [key2]) =>
    key1.localeCompare(key2)
  );

  await writeFileAsync(
    path.resolve(output, 'en.json'),
    outputFormat === 'json5' ? serializeToJson5(defaultMessages) : serializeToJson(defaultMessages)
  );
}
