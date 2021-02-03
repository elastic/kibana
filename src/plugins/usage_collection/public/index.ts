/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PluginInitializerContext } from '../../../core/public';
import { UsageCollectionPlugin } from './plugin';

export { METRIC_TYPE } from '@kbn/analytics';
export { UsageCollectionSetup, UsageCollectionStart } from './plugin';
export { TrackApplicationView } from './components';

export function plugin(initializerContext: PluginInitializerContext) {
  return new UsageCollectionPlugin(initializerContext);
}
