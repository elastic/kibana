/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { readFile as readFileAsync } from 'fs/promises';
import { globNamespacePaths, makeAbsolutePath } from '../../utils';
import { extractI18nMessageDescriptors } from '../../extractors/formatjs';
import { I18nConfig } from '../../types';

export interface Params {
  rootPaths: string[];
  config: I18nConfig;
}

export const getNamespacePathsForRoot = (rootPath: string, definedPaths: string[]) => {
  const absoluteRootPath = makeAbsolutePath(rootPath, true);

  return definedPaths
    .map((definedPath) => makeAbsolutePath(definedPath))
    .filter((definedPath) => definedPath.startsWith(absoluteRootPath));
};

export async function* extractUntrackedMessages(rootPath: string, definedPathsForRoot: string[]) {
  const untrackedFiles = await globNamespacePaths(rootPath, {
    additionalIgnore: [
      ...definedPathsForRoot,
      '**/build/**',
      '**/__fixtures__/**',
      '**/packages/kbn-i18n/**',
      '**/packages/kbn-i18n-react/**',
      '**/packages/kbn-plugin-generator/template/**',
      '**/test/**',
      '**/scripts/**',
      '**/src/dev/**',
      '**/target/**',
      '**/dist/**',

      // MUST BE DEFINED IN A NAMESPACE IGNORING UNTIL FIXED
      '**/x-pack/examples/**',
    ],
    absolute: true,
  });

  let itter = 1;
  for (const untrackedFilePath of untrackedFiles) {
    const source = await readFileAsync(untrackedFilePath, 'utf8');
    const extractedMessages = await extractI18nMessageDescriptors(untrackedFilePath, source);
    yield {
      untrackedFilePath,
      extractedMessages,
      totalChecked: itter,
      totalToCheck: untrackedFiles.length,
    };
    itter++;
  }
}
