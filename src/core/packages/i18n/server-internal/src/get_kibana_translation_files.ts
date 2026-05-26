/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFile } from 'fs/promises';
import { basename } from 'path';
import { createHash } from 'crypto';
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

/**
 * Groups a flat list of translation file paths by locale code
 * (the filename without the .json extension).
 */
export const groupFilesByLocale = (files: string[]): Record<string, string[]> => {
  const map: Record<string, string[]> = {};
  for (const file of files) {
    const locale = basename(file, '.json');
    (map[locale] ??= []).push(file);
  }
  return map;
};

/**
 * Hashes the raw bytes of a set of translation files without parsing them or
 * populating the loader cache. Files are sorted by path for determinism.
 * Returns a 12-character hex digest suitable for cache-busting URLs.
 */
export const computeLocaleFileHash = async (files: string[]): Promise<string> => {
  const sorted = [...files].sort();
  const hash = createHash('sha256');
  for (const file of sorted) {
    hash.update(await readFile(file));
  }
  return hash.digest('hex').slice(0, 12);
};
