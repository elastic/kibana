/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { InternalCoreSetup, InternalCoreStart } from '../internal_types';
import { PluginsServiceSetup, PluginsServiceStart, UiPlugins } from '../plugins';
import { InternalRenderingServiceSetup } from '../rendering';

/**
 * @internal
 * @deprecated
 */
export type LegacyVars = Record<string, any>;

type LegacyCoreSetup = InternalCoreSetup & {
  plugins: PluginsServiceSetup;
  rendering: InternalRenderingServiceSetup;
};
type LegacyCoreStart = InternalCoreStart & { plugins: PluginsServiceStart };

/**
 * New platform representation of the legacy configuration (KibanaConfig)
 *
 * @internal
 * @deprecated
 */
export interface LegacyConfig {
  get<T>(key?: string): T;
  has(key: string): boolean;
  set(key: string, value: any): void;
  set(config: LegacyVars): void;
}

/**
 * @public
 * @deprecated
 */
export interface LegacyServiceSetupDeps {
  core: LegacyCoreSetup;
  plugins: Record<string, unknown>;
  uiPlugins: UiPlugins;
}

/**
 * @public
 * @deprecated
 */
export interface LegacyServiceStartDeps {
  core: LegacyCoreStart;
  plugins: Record<string, unknown>;
}

/**
 * @internal
 * @deprecated
 */
export interface LegacyServiceSetupConfig {
  legacyConfig: LegacyConfig;
  settings: LegacyVars;
}
