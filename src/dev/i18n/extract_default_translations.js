/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'path';

import { extractCodeMessages } from './extractors';
import { globAsync, readFileAsync, normalizePath } from './utils';

import { createFailError, isFailError } from '@kbn/dev-utils';

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

function filterEntries(entries, exclude) {
  return entries.filter((entry) =>
    exclude.every((excludedPath) => !normalizePath(entry).startsWith(excludedPath))
  );
}

export function validateMessageNamespace(id, filePath, allowedPaths, reporter) {
  const normalizedPath = normalizePath(filePath);

  const [expectedNamespace] = Object.entries(allowedPaths).find(([, pluginPaths]) =>
    pluginPaths.some((pluginPath) => normalizedPath.startsWith(`${pluginPath}/`))
  );

  if (!id.startsWith(`${expectedNamespace}.`)) {
    reporter.report(
      createFailError(`Expected "${id}" id to have "${expectedNamespace}" namespace. \
See .i18nrc.json for the list of supported namespaces.`)
    );
  }
}

export async function matchEntriesWithExctractors(inputPath, options = {}) {
  const { additionalIgnore = [], mark = false, absolute = false } = options;
  const ignore = [
    '**/node_modules/**',
    '**/__tests__/**',
    '**/dist/**',
    '**/target/**',
    '**/vendor/**',
    '**/build/**',
    '**/*.test.{js,jsx,ts,tsx}',
    '**/*.d.ts',
  ].concat(additionalIgnore);

  const entries = await globAsync('*.{js,jsx,ts,tsx}', {
    cwd: inputPath,
    matchBase: true,
    ignore,
    mark,
    absolute,
  });

  const codeEntries = entries.reduce((paths, entry) => {
    const resolvedPath = path.resolve(inputPath, entry);
    paths.push(resolvedPath);

    return paths;
  }, []);

  return [[codeEntries, extractCodeMessages]];
}

export async function extractMessagesFromPathToMap(inputPath, targetMap, config, reporter) {
  const categorizedEntries = await matchEntriesWithExctractors(inputPath);
  return Promise.all(
    categorizedEntries.map(async ([entries, extractFunction]) => {
      const files = await Promise.all(
        filterEntries(entries, config.exclude).map(async (entry) => {
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
