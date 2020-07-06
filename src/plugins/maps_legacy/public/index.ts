/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// @ts-ignore
import { PluginInitializerContext } from 'kibana/public';
// @ts-ignore
import { L } from './leaflet';
import { MapsLegacyPlugin } from './plugin';
// @ts-ignore
import * as colorUtil from './map/color_util';
// @ts-ignore
import { KibanaMapLayer } from './map/kibana_map_layer';
// @ts-ignore
import { convertToGeoJson } from './map/convert_to_geojson';
// @ts-ignore
import { scaleBounds, getPrecision, geoContains } from './map/decode_geo_hash';
import {
  VectorLayer,
  FileLayerField,
  FileLayer,
  TmsLayer,
  IServiceSettings,
} from './map/service_settings';
// @ts-ignore
import { mapTooltipProvider } from './tooltip_provider';

import './map/index.scss';

export interface MapsLegacyConfigType {
  regionmap: any;
  emsTileLayerId: string;
  includeElasticMapsService: boolean;
  proxyElasticMapsServiceInMaps: boolean;
  tilemap: any;
}

export function plugin(initializerContext: PluginInitializerContext) {
  return new MapsLegacyPlugin(initializerContext);
}

/** @public */
export {
  scaleBounds,
  getPrecision,
  geoContains,
  colorUtil,
  convertToGeoJson,
  IServiceSettings,
  KibanaMapLayer,
  VectorLayer,
  FileLayerField,
  FileLayer,
  TmsLayer,
  mapTooltipProvider,
  L,
};

export * from './common/types';
export { ORIGIN } from './common/constants/origin';

export { WmsOptions } from './components/wms_options';

export type MapsLegacyPluginSetup = ReturnType<MapsLegacyPlugin['setup']>;
export type MapsLegacyPluginStart = ReturnType<MapsLegacyPlugin['start']>;
