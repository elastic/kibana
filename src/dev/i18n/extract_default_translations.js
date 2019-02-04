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
  extractHtmlMessages,
  extractCodeMessages,
  extractPugMessages,
  extractHandlebarsMessages,
} from './extractors';
import { globAsync, readFileAsync, normalizePath } from './utils';

import { createFailError, isFailError } from '../run';

function addMessageToMap(targetMap, key, value, reporter) {
  const existingValue = targetMap.get(key);

  if (targetMap.has(key) && existingValue.message !== value.message) {
    reporter.report(
      createFailError(`There is more than one default message for the same id "${key}":
"${existingValue.message}" and "${value.message}"`)
    );
  } else {
    targetMap.set(key, value);
  }
}

export function filterPaths(inputPaths, paths) {
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

function filterEntries(entries, exclude) {
  return entries.filter(entry =>
    exclude.every(excludedPath => !normalizePath(entry).startsWith(excludedPath))
  );
}

export function validateMessageNamespace(id, filePath, allowedPaths, reporter) {
  const normalizedPath = normalizePath(filePath);

  const [expectedNamespace] = Object.entries(allowedPaths).find(([, pluginPath]) =>
    normalizedPath.startsWith(`${pluginPath}/`)
  );

  if (!id.startsWith(`${expectedNamespace}.`)) {
    reporter.report(
      createFailError(`Expected "${id}" id to have "${expectedNamespace}" namespace. \
See .i18nrc.json for the list of supported namespaces.`)
    );
  }
}

export async function extractMessagesFromPathToMap(inputPath, targetMap, config, reporter) {
  const entries = await globAsync('*.{js,jsx,pug,ts,tsx,html,hbs,handlebars}', {
    cwd: inputPath,
    matchBase: true,
    ignore: ['**/node_modules/**', '**/__tests__/**', '**/*.test.{js,jsx,ts,tsx}', '**/*.d.ts'],
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
        filterEntries(entries, config.exclude).map(async entry => {
          return {
            name: entry,
            content: await readFileAsync(entry),
          };
        })
      );

      for (const { name, content } of files) {
        const reporterWithContext = reporter.withContext({ name });

        try {
          for (const [id, value] of extractFunction(content, reporterWithContext)) {
            validateMessageNamespace(id, name, config.paths, reporterWithContext);
            addMessageToMap(targetMap, id, value, reporterWithContext);
          }
        } catch (error) {
          if (!isFailError(error)) {
            throw error;
          }

          reporterWithContext.report(error);
        }
      }
    })
  );
}

export async function getDefaultMessagesMap(inputPaths, config, reporter) {
  const defaultMessagesMap = new Map();

  for (const inputPath of filterPaths(inputPaths, config.paths)) {
    await extractMessagesFromPathToMap(inputPath, defaultMessagesMap, config, reporter);
  }

  return defaultMessagesMap;
}
