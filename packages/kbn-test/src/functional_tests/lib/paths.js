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

import { resolve, relative } from 'path';

// resolve() treats relative paths as relative to process.cwd(),
// so to return a relative path we use relative()
function resolveRelative(path) {
  return relative(process.cwd(), resolve(path));
}

export const KIBANA_EXEC = 'node';
export const KIBANA_EXEC_PATH = resolveRelative('scripts/kibana');
export const KIBANA_ROOT = resolve(__dirname, '../../../../../');
export const KIBANA_FTR_SCRIPT = resolve(KIBANA_ROOT, 'scripts/functional_test_runner');
export const PROJECT_ROOT = resolve(__dirname, '../../../../../../');
export const FUNCTIONAL_CONFIG_PATH = resolve(KIBANA_ROOT, 'test/functional/config');
export const API_CONFIG_PATH = resolve(KIBANA_ROOT, 'test/api_integration/config');
export const OPTIMIZE_BUNDLE_DIR = resolve(KIBANA_ROOT, 'optimize/bundles');
