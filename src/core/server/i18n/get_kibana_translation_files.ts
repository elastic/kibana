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

import { basename } from 'path';
import { fromRoot } from '../utils';
import { getTranslationPaths } from './get_translation_paths';

export const getKibanaTranslationFiles = async (
  locale: string,
  pluginPaths: string[]
): Promise<string[]> => {
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

  return ([] as string[])
    .concat(...translationPaths)
    .filter((translationPath) => basename(translationPath, '.json') === locale);
};
