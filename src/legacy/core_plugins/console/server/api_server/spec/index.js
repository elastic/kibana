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

import glob from 'glob';
import { join, basename } from 'path';
import { readFileSync } from 'fs';
import { merge } from 'lodash';

const extensionSpecFilePaths = [];
function _getSpec(dirname = __dirname) {
  const generatedFiles = glob.sync(join(dirname, 'generated', '*.json'));
  const overrideFiles = glob.sync(join(dirname, 'overrides', '*.json'));

  return generatedFiles.reduce((acc, file) => {
    const overrideFile = overrideFiles.find(f => basename(f) === basename(file));
    const loadedSpec = JSON.parse(readFileSync(file, 'utf8'));
    if (overrideFile) {
      merge(loadedSpec, JSON.parse(readFileSync(overrideFile, 'utf8')));
    }
    const spec = {};
    Object.entries(loadedSpec).forEach(([key, value]) => {
      if (acc[key]) {
        // add time to remove key collision
        spec[`${key}${Date.now()}`] = value;
      } else {
        spec[key] = value;
      }
    });

    return { ...acc, ...spec };
  }, {});
}
export function getSpec() {
  const result = _getSpec();
  extensionSpecFilePaths.forEach(extensionSpecFilePath => {
    merge(result, _getSpec(extensionSpecFilePath));
  });
  return result;
}

export function addExtensionSpecFilePath(extensionSpecFilePath) {
  extensionSpecFilePaths.push(extensionSpecFilePath);
}
