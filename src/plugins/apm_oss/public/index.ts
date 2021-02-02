/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ApmOssPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new ApmOssPlugin();
}
export { ApmOssPluginSetup, ApmOssPluginStart } from './types';

export { APM_STATIC_INDEX_PATTERN_ID } from '../common/index_pattern_constants';
