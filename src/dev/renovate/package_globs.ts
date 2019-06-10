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

import { readFileSync } from 'fs';

import globby from 'globby';

import { REPO_ROOT } from '../constants';

export const PACKAGE_GLOBS = [
  'package.json',
  'x-pack/package.json',
  'x-pack/plugins/*/package.json',
  'packages/*/package.json',
  'test/plugin_functional/plugins/*/package.json',
  'test/interpreter_functional/plugins/*/package.json',
];

export function getAllDepNames() {
  const depNames = new Set<string>();

  for (const glob of PACKAGE_GLOBS) {
    const files = globby.sync(glob, {
      cwd: REPO_ROOT,
      absolute: true,
    });

    for (const path of files) {
      const pkg = JSON.parse(readFileSync(path, 'utf8'));
      const deps = [
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.devDependencies || {}),
      ];

      for (const dep of deps) {
        depNames.add(dep);
      }
    }
  }

  return depNames;
}
