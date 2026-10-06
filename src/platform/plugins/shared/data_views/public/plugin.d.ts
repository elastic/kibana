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
  DataViewsPublicPluginSetup,
  DataViewsPublicPluginStart,
  DataViewsPublicSetupDependencies,
  DataViewsPublicStartDependencies,
} from './types';
export declare class DataViewsPublicPlugin
  implements
    Plugin<
      DataViewsPublicPluginSetup,
      DataViewsPublicPluginStart,
      DataViewsPublicSetupDependencies,
      DataViewsPublicStartDependencies
    >
{
  private readonly initializerContext;
  private readonly hasData;
  private rollupsEnabled;
  private readonly callResolveCluster;
  constructor(initializerContext: PluginInitializerContext);
  setup(
    core: CoreSetup<DataViewsPublicStartDependencies, DataViewsPublicPluginStart>,
    { expressions, contentManagement }: DataViewsPublicSetupDependencies
  ): DataViewsPublicPluginSetup;
  start(
    core: CoreStart,
    { fieldFormats, contentManagement, cps }: DataViewsPublicStartDependencies
  ): DataViewsPublicPluginStart;
  stop(): void;
}
