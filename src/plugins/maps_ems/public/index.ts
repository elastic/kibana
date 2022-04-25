/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PluginInitializerContext } from '@kbn/core/public';
import type { EMSClient } from '@elastic/ems-client';
import { MapsEmsPlugin } from './plugin';
import type { MapConfig } from '../config';
import type { EMSSettings } from '../common';

export function plugin(initializerContext: PluginInitializerContext) {
  return new MapsEmsPlugin(initializerContext);
}

export type { MapConfig, TileMapConfig } from '../config';
export type { EMSConfig } from '../common';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MapsEmsPluginPublicSetup {}

export interface MapsEmsPluginPublicStart {
  config: MapConfig;
  createEMSSettings(): EMSSettings;
  createEMSClient(): Promise<EMSClient>;
}
