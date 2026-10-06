/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { PluginName } from '@kbn/core-base-common';
import type {
  PluginContractResolverResponse,
  PluginContractMap,
} from '@kbn/core-plugins-contracts-browser';
export type IRuntimePluginContractResolver = PublicMethodsOf<RuntimePluginContractResolver>;
export declare class RuntimePluginContractResolver {
  private dependencyMap?;
  private setupContracts?;
  private startContracts?;
  private readonly setupRequestQueue;
  private readonly startRequestQueue;
  setDependencyMap(depMap: Map<PluginName, Set<PluginName>>): void;
  onSetup: <T extends PluginContractMap>(
    pluginName: PluginName,
    dependencyNames: Array<keyof T>
  ) => Promise<PluginContractResolverResponse<T>>;
  onStart: <T extends PluginContractMap>(
    pluginName: PluginName,
    dependencyNames: Array<keyof T>
  ) => Promise<PluginContractResolverResponse<T>>;
  resolveSetupRequests(setupContracts: Map<PluginName, unknown>): void;
  resolveStartRequests(startContracts: Map<PluginName, unknown>): void;
}
