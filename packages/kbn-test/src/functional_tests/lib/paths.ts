/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { REPO_ROOT } from '@kbn/utils';
import { resolve, relative } from 'path';

// resolve() treats relative paths as relative to process.cwd(),
// so to return a relative path we use relative()
function resolveRelative(path: string) {
  return relative(process.cwd(), resolve(path));
}

export const KIBANA_EXEC = 'node';
export const KIBANA_EXEC_PATH = resolveRelative('scripts/kibana');
export const KIBANA_ROOT = REPO_ROOT;
export const KIBANA_FTR_SCRIPT = resolve(KIBANA_ROOT, 'scripts/functional_test_runner');
export const PROJECT_ROOT = resolve(__dirname, '../../../../../../');
export const FUNCTIONAL_CONFIG_PATH = resolve(KIBANA_ROOT, 'test/functional/config');
export const API_CONFIG_PATH = resolve(KIBANA_ROOT, 'test/api_integration/config');
