/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// TODO: https://github.com/elastic/kibana/issues/109853
/* eslint-disable @kbn/eslint/no_export_all */

import { PluginInitializerContext } from 'kibana/public';
import { MapsEmsPlugin } from './plugin';
import { IServiceSettings } from './service_settings';
import type { MapsEmsConfig } from '../config';

/** @public */
export {
  VectorLayer,
  FileLayerField,
  FileLayer,
  TmsLayer,
  IServiceSettings,
} from './service_settings';

export function plugin(initializerContext: PluginInitializerContext) {
  return new MapsEmsPlugin(initializerContext);
}

export type { MapsEmsConfig } from '../config';

export * from '../common';

export interface MapsEmsPluginSetup {
  config: MapsEmsConfig;
  getServiceSettings: () => Promise<IServiceSettings>;
}
export type MapsEmsPluginStart = ReturnType<MapsEmsPlugin['start']>;
