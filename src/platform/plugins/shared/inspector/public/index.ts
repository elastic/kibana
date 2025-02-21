/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TODO: https://github.com/elastic/kibana/issues/109900

import './index.scss';

import { PluginInitializerContext } from '@kbn/core/public';
import { InspectorPublicPlugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new InspectorPublicPlugin(initializerContext);
}
export {
  type Adapters,
  type Request,
  type RequestStatistic,
  type RequestStatistics,
  RequestAdapter,
  RequestStatus,
  RequestResponder,
} from '../common';
export {
  apiHasInspectorAdapters,
  type HasInspectorAdapters,
} from './adapters/has_inspector_adapters';
export { InspectorPublicPlugin as Plugin } from './plugin';
export type { Setup, Start } from './plugin';
export type {
  InspectorViewProps,
  InspectorViewDescription,
  InspectorOptions,
  InspectorSession,
} from './types';
