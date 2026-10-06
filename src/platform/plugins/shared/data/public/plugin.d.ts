/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { ConfigSchema } from '../server/config';
import type {
  DataPublicPluginSetup,
  DataPublicPluginStart,
  DataSetupDependencies,
  DataStartDependencies,
} from './types';
export declare class DataPublicPlugin
  implements
    Plugin<
      DataPublicPluginSetup,
      DataPublicPluginStart,
      DataSetupDependencies,
      DataStartDependencies
    >
{
  private readonly searchService;
  private readonly queryService;
  private readonly storage;
  private readonly nowProvider;
  constructor(initializerContext: PluginInitializerContext<ConfigSchema>);
  setup(
    core: CoreSetup<DataStartDependencies, DataPublicPluginStart>,
    { expressions, uiActions, usageCollection, inspector, fieldFormats }: DataSetupDependencies
  ): DataPublicPluginSetup;
  start(
    core: CoreStart,
    { uiActions, fieldFormats, dataViews, inspector, screenshotMode, cps }: DataStartDependencies
  ): DataPublicPluginStart;
  stop(): void;
}
