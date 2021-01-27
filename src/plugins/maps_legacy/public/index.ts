/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PluginInitializerContext } from 'kibana/public';
import { MapsLegacyPlugin } from './plugin';
// @ts-ignore
import * as colorUtil from './map/color_util';
// @ts-ignore
import { KibanaMapLayer } from './map/kibana_map_layer';
import {
  VectorLayer,
  FileLayerField,
  FileLayer,
  TmsLayer,
  IServiceSettings,
} from './map/service_settings_types';
// @ts-ignore
import { mapTooltipProvider } from './tooltip_provider';

import './map/index.scss';

export function plugin(initializerContext: PluginInitializerContext) {
  return new MapsLegacyPlugin(initializerContext);
}

/** @public */
export {
  colorUtil,
  IServiceSettings,
  KibanaMapLayer,
  VectorLayer,
  FileLayerField,
  FileLayer,
  TmsLayer,
  mapTooltipProvider,
};

export * from '../common';
export * from './common/types';
export { ORIGIN, TMS_IN_YML_ID } from './common/constants';

export { WmsOptions } from './components/wms_options';
export { LegacyMapDeprecationMessage } from './components/legacy_map_deprecation_message';

export { lazyLoadMapsLegacyModules } from './lazy_load_bundle';

export type MapsLegacyPluginSetup = ReturnType<MapsLegacyPlugin['setup']>;
export type MapsLegacyPluginStart = ReturnType<MapsLegacyPlugin['start']>;
