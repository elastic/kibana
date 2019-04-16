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

import {
  ErrorReporter,
  I18nConfig,
  matchEntriesWithExctractors,
  normalizePath,
  readFileAsync,
} from '..';

function filterEntries(entries: string[], exclude: string[]) {
  return entries.filter((entry: string) =>
    exclude.every((excludedPath: string) => !normalizePath(entry).startsWith(excludedPath))
  );
}

export async function extractUntrackedMessages({
  path,
  config,
}: {
  path?: string | string[];
  config: I18nConfig;
}) {
  const inputPaths = Array.isArray(path) ? path : [path || './'];
  const availablePaths = Object.values(config.paths);
  const ignore = availablePaths.concat([
    '**/build/**',
    '**/webpackShims/**',
    '**/__fixtures__/**',
    'utilities/**',
    'built_assets/**',
    'docs/**',
    'optimize/**',
    'data/**',
    '**/target/**',
    'tasks/**',
    '**/test/**',
    '**/scripts/**',
    'src/dev/**',
    '**/target/**',
    'plugins/canvas/**',
  ]);
  const reporter = new ErrorReporter();
  for (const inputPath of inputPaths) {
    const categorizedEntries = await matchEntriesWithExctractors(inputPath, {
      additionalIgnore: ignore,
      mark: true,
      absolute: true,
    });

    await Promise.all(
      categorizedEntries.map(async ([entries, extractFunction]) => {
        const files: any = await Promise.all(
          filterEntries(entries, config.exclude)
            .filter(entry => {
              const normalizedEntry = normalizePath(entry);
              return !availablePaths.some(
                availablePath =>
                  normalizedEntry.startsWith(`${normalizePath(availablePath)}/`) ||
                  normalizePath(availablePath) === normalizedEntry
              );
            })
            .map(async (entry: any) => ({
              name: entry,
              content: await readFileAsync(entry),
            }))
        );

        for (const { name, content } of files) {
          const reporterWithContext = reporter.withContext({ name });
          for (const [id] of extractFunction(content, reporterWithContext)) {
            reporterWithContext.report(`File ${name} contains i18n label (${id}).`);
          }
        }
      })
    );
  }
}
