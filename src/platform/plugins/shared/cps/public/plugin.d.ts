/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type {
  CPSPluginSetup,
  CPSPluginStart,
  CPSPluginStartDependencies,
  CPSConfigType,
} from './types';
export declare class CpsPlugin
  implements Plugin<CPSPluginSetup, CPSPluginStart, {}, CPSPluginStartDependencies>
{
  private readonly initializerContext;
  private readonly appAccessResolvers;
  constructor(initializerContext: PluginInitializerContext<CPSConfigType>);
  setup(core: CoreSetup): CPSPluginSetup;
  start(core: CoreStart, { cloud }?: CPSPluginStartDependencies): CPSPluginStart;
  stop(): void;
}
