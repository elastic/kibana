/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// TODO: https://github.com/elastic/kibana/issues/109900
/* eslint-disable @kbn/eslint/no_export_all */

import './index.scss';

import { PluginInitializerContext } from '../../../core/public';
import { InspectorPublicPlugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new InspectorPublicPlugin(initializerContext);
}

export type { Setup, Start } from './plugin';
export { InspectorPublicPlugin as Plugin } from './plugin';
export * from './types';
export * from '../common/adapters';
