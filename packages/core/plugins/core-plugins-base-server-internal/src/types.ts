/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Observable } from 'rxjs';
import type { DiscoveredPlugin, PluginName } from '@kbn/core-base-common';

/** @internal */
export interface UiPlugins {
  /**
   * Paths to all discovered ui plugin entrypoints on the filesystem, even if
   * disabled.
   */
  internal: Map<PluginName, InternalPluginInfo>;

  /**
   * Information needed by client-side to load plugins and wire dependencies.
   */
  public: Map<PluginName, DiscoveredPlugin>;

  /**
   * Configuration for plugins to be exposed to the client-side.
   */
  browserConfigs: Map<PluginName, Observable<unknown>>;
}

/**
 * @internal
 */
export interface InternalPluginInfo {
  /**
   * Version of the plugin
   */
  readonly version: string;
  /**
   * Bundles that must be loaded for this plugin
   */
  readonly requiredBundles: readonly string[];
  /**
   * Path to the target/public directory of the plugin which should be served
   */
  readonly publicTargetDir: string;
  /**
   * Path to the plugin assets directory.
   */
  readonly publicAssetsDir: string;
}
