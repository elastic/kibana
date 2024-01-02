/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext } from '@kbn/core-plugins-browser';
import { NoDataPagePublic } from './plugin';

export function plugin(ctx: PluginInitializerContext) {
  return new NoDataPagePublic(ctx);
}

export type {
  NoDataPagePublicSetup as NoDataPagePublicSetup,
  NoDataPagePublicStart as NoDataPagePublicStart,
} from './types';
