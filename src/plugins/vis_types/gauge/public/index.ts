/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext } from '@kbn/core/public';
import { GaugePublicConfig } from '../config';
import { VisTypeGaugePlugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext<GaugePublicConfig>) {
  return new VisTypeGaugePlugin(initializerContext);
}

export type { VisTypeGaugePluginSetup, VisTypeGaugePluginStart } from './types';

export { gaugeVisType, goalVisType } from './vis_type';
