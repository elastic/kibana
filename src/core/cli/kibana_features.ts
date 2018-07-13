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

import { lstatSync, realpathSync } from 'fs';
import { resolve } from 'path';

const XPACK_SOURCE_PATH = resolve(__dirname, '../../../x-pack');

export const XPACK_INSTALLED_PATH = resolve(__dirname, '../../../node_modules/x-pack');
export const CLUSTER_MANAGER_PATH = resolve(__dirname, '../../legacy/cli/cluster/cluster_manager');
export const REPL_PATH = resolve(__dirname, '../../legacy/cli/repl');

function isSymlinkTo(link: string, dest: string) {
  try {
    const stat = lstatSync(link);
    return stat.isSymbolicLink() && realpathSync(link) === dest;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

function canRequire(path: string) {
  try {
    require.resolve(path);
    return true;
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      return false;
    } else {
      throw error;
    }
  }
}

export function detectKibanaFeatures() {
  return {
    // If we can access `cluster_manager.js` that means we can run Kibana in a so called cluster
    // mode when Kibana is run as a "worker" process together with optimizer "worker" process.
    isClusterModeSupported: canRequire(CLUSTER_MANAGER_PATH),

    // X-Pack is installed in both dev and the distributable, it's optional if
    // install is a link to the source, not an actual install.
    isOssModeSupported: isSymlinkTo(XPACK_INSTALLED_PATH, XPACK_SOURCE_PATH),

    // If we can access `repl/` that means we can run Kibana in REPL mode.
    isReplModeSupported: canRequire(REPL_PATH),

    // X-Pack is considered as installed if it's available in `node_modules` folder and it
    // looks the same for both dev and the distributable.
    isXPackInstalled: canRequire(XPACK_INSTALLED_PATH),
  };
}

export type KibanaFeatures = ReturnType<typeof detectKibanaFeatures>;
