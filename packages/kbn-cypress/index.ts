/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { run as internalRun } from './lib/run';
import { CurrentsRunAPI } from './types';
export type { CurrentsRunAPI } from './types';
export { cloudPlugin } from './plugin';
/**
 * Run Cypress tests with a cloud service of your choice and return the results
 *
 * @augments CurrentsRunAPI
 * @returns {CypressCommandLine.CypressRunResult | CypressCommandLine.CypressFailedRunResult | undefined} The test results, or undefined if no tests were run
 */
export function run(params?: CurrentsRunAPI) {
  return internalRun(params);
}
