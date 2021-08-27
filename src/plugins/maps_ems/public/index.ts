/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { PluginInitializerContext } from '../../../core/public/plugins/plugin_context';
import type { MapsEmsConfig } from '../config';
import { MapsEmsPlugin } from './plugin';
import type { IServiceSettings } from './service_settings/service_settings_types';

/** @public */
export * from '../common';
export type { LayerConfig, MapsEmsConfig } from '../config';
export {
  FileLayer,
  FileLayerField,
  IServiceSettings,
  TmsLayer,
  VectorLayer,
} from './service_settings';

export function plugin(initializerContext: PluginInitializerContext) {
  return new MapsEmsPlugin(initializerContext);
}

export interface MapsEmsPluginSetup {
  config: MapsEmsConfig;
  getServiceSettings: () => Promise<IServiceSettings>;
}
export type MapsEmsPluginStart = ReturnType<MapsEmsPlugin['start']>;
