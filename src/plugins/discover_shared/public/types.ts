/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Plugin } from '@kbn/core/public';
import {
  DiscoverFeaturesServiceSetup,
  DiscoverFeaturesServiceStart,
} from './services/discover_features';

export interface DiscoverSharedPublicSetup {
  features: DiscoverFeaturesServiceSetup;
}

export interface DiscoverSharedPublicStart {
  features: DiscoverFeaturesServiceStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DiscoverSharedPublicSetupDeps {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DiscoverSharedPublicStartDeps {}

export type DiscoverSharedPublicPlugin = Plugin<
  DiscoverSharedPublicSetup,
  DiscoverSharedPublicStart,
  DiscoverSharedPublicSetupDeps,
  DiscoverSharedPublicStartDeps
>;
