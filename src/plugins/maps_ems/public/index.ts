/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PluginInitializerContext } from 'kibana/public';
import type { EMSClient } from '@elastic/ems-client';
import { MapsEmsPlugin } from './plugin';
import type { MapConfig } from '../config';
import type { EMSSettings } from '../common';

export function plugin(initializerContext: PluginInitializerContext) {
  return new MapsEmsPlugin(initializerContext);
}

export type { MapConfig, TileMapConfig } from '../config';
export type { EMSConfig } from '../common';

export interface MapsEmsPluginPublicSetup {
  config: MapConfig;
  createEMSSettings(): EMSSettings;
  createEMSClient(): Promise<EMSClient>;
}
export type MapsEmsPluginPublicStart = ReturnType<MapsEmsPlugin['start']>;
