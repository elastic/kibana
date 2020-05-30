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

import { PluginPack } from './plugin_pack';
import { map, catchError } from 'rxjs/operators';
import { createInvalidPackError } from '../errors';

function createPack(packageJson) {
  let provider = require(packageJson.directoryPath); // eslint-disable-line import/no-dynamic-require
  if (provider.__esModule) {
    provider = provider.default;
  }
  if (typeof provider !== 'function') {
    throw createInvalidPackError(packageJson.directoryPath, 'must export a function');
  }

  return new PluginPack({ path: packageJson.directoryPath, pkg: packageJson.contents, provider });
}

export const createPack$ = (packageJson$) =>
  packageJson$.pipe(
    map(({ error, packageJson }) => {
      if (error) {
        return { error };
      }

      if (!packageJson) {
        throw new Error('packageJson is required to create the pack');
      }

      return {
        pack: createPack(packageJson),
      };
    }),
    // createPack can throw errors, and we want them to be represented
    // like the errors we consume from createPackageJsonAtPath/Directory
    catchError((error) => [{ error }])
  );
