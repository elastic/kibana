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

import cloneDeepWith from 'lodash.clonedeepwith';
import { resolve, sep as pathSep } from 'path';

const repoRoot = resolve(__dirname, '../../../../');

const normalizePaths = (value: any) => {
  let didReplacement = false;
  const clone = cloneDeepWith(value, (v: any) => {
    if (typeof v === 'string' && v.startsWith(repoRoot)) {
      didReplacement = true;
      return v
        .replace(repoRoot, '<repoRoot>')
        .split(pathSep) // normalize path separators
        .join('/');
    }
  });

  return {
    clone,
    didReplacement,
  };
};

export const absolutePathSnapshotSerializer = {
  print(value: any, serialize: (val: any) => string) {
    return serialize(normalizePaths(value).clone);
  },

  test(value: any) {
    return normalizePaths(value).didReplacement;
  },
};
