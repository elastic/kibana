/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext } from '@kbn/core/public';
import { ManagementPlugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new ManagementPlugin(initializerContext);
}

export type { RegisterManagementAppArgs } from './utils';
export { ManagementSection, ManagementApp } from './utils';

export type {
  ManagementAppMountParams,
  ManagementSetup,
  ManagementStart,
  DefinedSections,
} from './types';

export { MANAGEMENT_APP_ID } from '../common/contants';
