/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PluginInitializerContext } from '@kbn/core/public';
import type { GaugePublicConfig } from '../server/config';
import { VisTypeGaugePlugin } from './plugin';

export async function getGaugeVisType() {
  const { getGaugeVisType: getVisType } = await import('./vis_type/vis_types_module');
  return getVisType({});
}

export async function getGoalVisType() {
  const { getGoalVisType: getVisType } = await import('./vis_type/vis_types_module');
  return getVisType({});
}

export function plugin(initializerContext: PluginInitializerContext<GaugePublicConfig>) {
  return new VisTypeGaugePlugin(initializerContext);
}

export type { VisTypeGaugePluginSetup, VisTypeGaugePluginStart } from './types';
