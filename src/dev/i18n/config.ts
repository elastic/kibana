/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve } from 'path';

// @ts-ignore
import { normalizePath, readFileAsync } from '.';

export interface I18nConfig {
  paths: Record<string, string[]>;
  exclude: string[];
  translations: string[];
  prefix?: string;
}

export async function checkConfigNamespacePrefix(configPath: string) {
  const { prefix, paths } = JSON.parse(await readFileAsync(resolve(configPath)));
  for (const [namespace] of Object.entries(paths)) {
    if (prefix && prefix !== namespace.split('.')[0]) {
      throw new Error(`namespace ${namespace} must be prefixed with ${prefix} in ${configPath}`);
    }
  }
}

export async function assignConfigFromPath(
  config: I18nConfig = { exclude: [], translations: [], paths: {} },
  configPath: string
) {
  const additionalConfig: I18nConfig = {
    paths: {},
    exclude: [],
    translations: [],
    ...JSON.parse(await readFileAsync(resolve(configPath))),
  };

  for (const [namespace, namespacePaths] of Object.entries(additionalConfig.paths)) {
    const paths = Array.isArray(namespacePaths) ? namespacePaths : [namespacePaths];
    config.paths[namespace] = paths.map((path) => normalizePath(resolve(configPath, '..', path)));
  }

  for (const exclude of additionalConfig.exclude) {
    config.exclude.push(normalizePath(resolve(configPath, '..', exclude)));
  }

  for (const translations of additionalConfig.translations) {
    config.translations.push(normalizePath(resolve(configPath, '..', translations)));
  }

  return config;
}

/**
 * Filters out custom paths based on the paths defined in config and that are
 * known to contain i18n strings.
 * @param inputPaths List of paths to filter.
 * @param config I18n config instance.
 */
export function filterConfigPaths(inputPaths: string[], config: I18nConfig) {
  const availablePaths = Object.values(config.paths).flat();
  const pathsForExtraction = new Set();

  for (const inputPath of inputPaths) {
    const normalizedPath = normalizePath(inputPath);

    // If input path is the sub path of or equal to any available path, include it.
    if (
      availablePaths.some(
        (path) => normalizedPath.startsWith(`${path}/`) || path === normalizedPath
      )
    ) {
      pathsForExtraction.add(normalizedPath);
    } else {
      // Otherwise go through all available paths and see if any of them is the sub
      // path of the input path (empty normalized path corresponds to root or above).
      availablePaths
        .filter((path) => !normalizedPath || path.startsWith(`${normalizedPath}/`))
        .forEach((ePath) => pathsForExtraction.add(ePath));
    }
  }

  return [...pathsForExtraction];
}
