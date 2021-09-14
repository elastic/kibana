/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve, dirname } from 'path';
import globby from 'globby';
import { readFile } from './fs';

interface I18NRCFileStructure {
  translations?: string[];
}

const I18N_RC = '.i18nrc.json';

export async function getTranslationPaths({ cwd, nested }: { cwd: string; nested: boolean }) {
  const glob = nested ? `*/${I18N_RC}` : I18N_RC;
  const entries = await globby(glob, { cwd, dot: true });
  const translationPaths: string[] = [];

  for (const entry of entries) {
    const entryFullPath = resolve(cwd, entry);
    const pluginBasePath = dirname(entryFullPath);
    try {
      const content = await readFile(entryFullPath, 'utf8');
      const { translations } = JSON.parse(content) as I18NRCFileStructure;
      if (translations && translations.length) {
        translations.forEach((translation) => {
          const translationFullPath = resolve(pluginBasePath, translation);
          translationPaths.push(translationFullPath);
        });
      }
    } catch (err) {
      throw new Error(`Failed to parse .i18nrc.json file at ${entryFullPath}`);
    }
  }

  return translationPaths;
}
