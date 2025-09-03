/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginInitializerContext } from '@kbn/core/public';
import { InspectorPublicPlugin } from './plugin';

/**
 * The `public/index` file exports must export the inspector plugin.
 *
 * Please do not export any static code from this file. All static code
 * should be exported from the `@kbn/inspector-browser` package.
 *
 * Types can be exported from this file, but plugins and packages may prefer to
 * import them from `@kbn/inspector-browser` or `@kbn/inspector-common`
 * packages to avoid circular graph issues.
 */

export function plugin(initializerContext: PluginInitializerContext) {
  return new InspectorPublicPlugin(initializerContext);
}
export {
  type Adapters,
  type Request,
  type RequestStatistic,
  type RequestStatistics,
} from '@kbn/inspector-common';
export { InspectorPublicPlugin as Plugin } from './plugin';
export type { Setup, Start } from './plugin';
export type {
  InspectorViewProps,
  InspectorViewDescription,
  InspectorOptions,
  InspectorSession,
} from './types';
