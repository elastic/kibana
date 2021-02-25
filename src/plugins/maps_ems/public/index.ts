/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext } from 'kibana/public';
import { MapsEmsPlugin } from './plugin';
import {
  VectorLayer,
  FileLayerField,
  FileLayer,
  TmsLayer,
  IServiceSettings,
} from './service_settings/service_settings_types';

import './map/index.scss';

export function plugin(initializerContext: PluginInitializerContext) {
  return new MapsEmsPlugin(initializerContext);
}

/** @public */
export { IServiceSettings, VectorLayer, FileLayerField, FileLayer, TmsLayer };

export * from '../common';

export type MapsEmsPluginSetup = ReturnType<MapsEmsPlugin['setup']>;
export type MapsEmsPluginStart = ReturnType<MapsEmsPlugin['start']>;
