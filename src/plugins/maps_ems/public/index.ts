/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext } from 'kibana/public';
import { MapsEmsPlugin } from './plugin';
import { IEMSKbnMapsSettings } from './service_settings';
import type { MapsEmsConfig } from '../config';
import { EMSSettings } from '../common';
import { IEMSConfig } from '../common/ems_settings';

/** @public */
export type {
  VectorLayer,
  FileLayerField,
  FileLayer,
  TmsLayer,
  IEMSKbnMapsSettings,
} from './service_settings';

export function plugin(initializerContext: PluginInitializerContext) {
  return new MapsEmsPlugin(initializerContext);
}

export { TMS_IN_YML_ID } from '../common';

export type { MapsEmsConfig } from '../config';

export interface MapsEmsPluginSetup {
  config: MapsEmsConfig;
  getServiceSettings(): Promise<IEMSKbnMapsSettings>;
  createEMSSettings(config: IEMSConfig, getIsEnterPrisePlus: () => boolean): EMSSettings;
}
export type MapsEmsPluginStart = ReturnType<MapsEmsPlugin['start']>;
