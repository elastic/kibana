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

// @ts-ignore
import { normalizePath, readFileAsync } from '.';
// @ts-ignore
import rootConfig from '../../../.i18nrc.json';

export interface I18nConfig {
  paths: Record<string, string>;
  exclude: string[];
  translations: string[];
}

/**
 * Merges root .i18nrc.json config with any other additional configs (e.g. from
 * third-party plugins).
 * @param configPaths List of config paths.
 */
export async function mergeConfigs(configPaths: string | string[] = []) {
  const mergedConfig: I18nConfig = { exclude: [], translations: [], ...rootConfig };

  for (const configPath of Array.isArray(configPaths) ? configPaths : [configPaths]) {
    const additionalConfig: I18nConfig = {
      paths: {},
      exclude: [],
      translations: [],
      ...JSON.parse(await readFileAsync(resolve(configPath))),
    };

    for (const [namespace, path] of Object.entries(additionalConfig.paths)) {
      mergedConfig.paths[namespace] = normalizePath(resolve(configPath, '..', path));
    }

    for (const exclude of additionalConfig.exclude) {
      mergedConfig.exclude.push(normalizePath(resolve(configPath, '..', exclude)));
    }

    for (const translations of additionalConfig.translations) {
      mergedConfig.translations.push(normalizePath(resolve(configPath, '..', translations)));
    }
  }

  return mergedConfig;
}

/**
 * Filters out custom paths based on the paths defined in config and that are
 * known to contain i18n strings.
 * @param inputPaths List of paths to filter.
 * @param config I18n config instance.
 */
export function filterConfigPaths(inputPaths: string[], config: I18nConfig) {
  const availablePaths = Object.values(config.paths);
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
