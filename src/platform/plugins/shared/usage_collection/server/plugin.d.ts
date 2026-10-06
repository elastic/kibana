/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import type { ICollectorSet } from './collector/types';
import type { UsageCountersServiceSetup, UsageCountersServiceStart } from './usage_counters/types';
/** Plugin's setup API **/
export type UsageCollectionSetup = ICollectorSet & UsageCountersServiceSetup;
/** Plugin's start API **/
export type UsageCollectionStart = UsageCountersServiceStart;
export declare class UsageCollectionPlugin
  implements Plugin<UsageCollectionSetup, UsageCollectionStart>
{
  private readonly initializerContext;
  private readonly logger;
  private savedObjects?;
  private usageCountersService?;
  constructor(initializerContext: PluginInitializerContext);
  setup(core: CoreSetup): UsageCollectionSetup;
  start({ savedObjects }: CoreStart): UsageCollectionStart;
  stop(): void;
}
