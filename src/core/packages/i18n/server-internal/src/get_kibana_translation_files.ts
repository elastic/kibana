/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { basename } from 'path';
import { fromRoot } from '@kbn/repo-info';
import { asyncMapWithLimit } from '@kbn/std';
import { getPackages, getPluginPackagesFilter } from '@kbn/repo-packages';
import { getTranslationPaths } from './get_translation_paths';

export const discoverAllTranslationPaths = async (pluginPaths: string[]): Promise<string[]> => {
  const translationPaths = await Promise.all([
    getTranslationPaths({
      cwd: fromRoot('.'),
      nested: true,
    }),
    asyncMapWithLimit(
      getPackages(fromRoot('.')).filter(getPluginPackagesFilter({ paths: pluginPaths })),
      20,
      async (pkg) => await getTranslationPaths({ cwd: pkg.directory, nested: false })
    ),
    asyncMapWithLimit(
      pluginPaths,
      20,
      async (pluginPath) => await getTranslationPaths({ cwd: pluginPath, nested: false })
    ),
    getTranslationPaths({
      cwd: fromRoot('../kibana-extra'),
      nested: true,
    }),
  ]);

  return translationPaths.flat(2);
};

export const getKibanaTranslationFiles = async (
  locale: string,
  pluginPaths: string[]
): Promise<string[]> => {
  const allPaths = await discoverAllTranslationPaths(pluginPaths);
  return allPaths.filter((translationPath) => basename(translationPath, '.json') === locale);
};

export const getAllKibanaTranslationFiles = async (
  pluginPaths: string[],
  supportedLocales: readonly string[]
): Promise<string[]> => {
  if (supportedLocales.length === 0) {
    return [];
  }
  const allPaths = await discoverAllTranslationPaths(pluginPaths);
  const allowed = new Set(supportedLocales);
  return allPaths.filter((translationPath) => allowed.has(basename(translationPath, '.json')));
};
