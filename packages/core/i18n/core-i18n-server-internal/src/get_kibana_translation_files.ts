/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { fromRoot } from '@kbn/utils';
import { getTranslationPaths } from './get_translation_paths';

export const getKibanaTranslationFiles = async ({
  pluginPaths,
}: {
  pluginPaths: string[];
}): Promise<string[]> => {
  const translationPaths = await Promise.all([
    getTranslationPaths({
      cwd: fromRoot('.'),
      nested: true,
    }),
    ...pluginPaths.map((pluginPath) => getTranslationPaths({ cwd: pluginPath, nested: false })),
    getTranslationPaths({
      cwd: fromRoot('../kibana-extra'),
      nested: true,
    }),
  ]);

  return ([] as string[]).concat(...translationPaths);
};
