/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContainerModule } from 'inversify';
import type { PluginInitializer } from '@kbn/core-plugins-browser';
/**
 * Unknown variant for internal use only for when plugins are not known.
 * @internal
 */
export type UnknownPluginInitializer = PluginInitializer<unknown, unknown>;
/**
 * @internal
 */
export interface PluginDefinition {
  module?: ContainerModule;
  plugin?: UnknownPluginInitializer;
}
/**
 * Custom window type for loading bundles. Do not extend global Window to avoid leaking these types.
 * @internal
 */
export interface CoreWindow {
  __kbnBundles__: {
    has(key: string): boolean;
    get(key: string): PluginDefinition | undefined;
  };
}
/**
 * Reads the plugin's bundle declared in the global context via __kbnBundles__.
 */
export declare function read(name: string): PluginDefinition;
