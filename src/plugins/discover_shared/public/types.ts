/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Plugin } from '@kbn/core/public';
import {
  DiscoverFeaturesServiceSetup,
  DiscoverFeaturesServiceStart,
} from './services/discover_features';

export interface DiscoverSharedClientSetupExports {
  features: DiscoverFeaturesServiceSetup;
}

export interface DiscoverSharedClientStartExports {
  features: DiscoverFeaturesServiceStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DiscoverSharedClientPluginSetupDeps {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DiscoverSharedClientPluginStartDeps {}

export type DiscoverSharedClientPlugin = Plugin<
  DiscoverSharedClientSetupExports,
  DiscoverSharedClientStartExports,
  DiscoverSharedClientPluginSetupDeps,
  DiscoverSharedClientPluginStartDeps
>;
