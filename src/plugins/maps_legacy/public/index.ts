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

import { CoreSetup } from 'kibana/public';
import { bindSetupCoreAndPlugins, MapsLegacyPlugin } from './plugin';
// @ts-ignore
import * as colorUtil from './map/color_util';
// @ts-ignore
import { KibanaMap } from './map/kibana_map';
// @ts-ignore
import { KibanaMapLayer } from './map/kibana_map_layer';
// @ts-ignore
import { convertToGeoJson } from './map/convert_to_geojson';
// @ts-ignore
import { scaleBounds, getPrecision, geoContains } from './map/decode_geo_hash';
// @ts-ignore
import { BaseMapsVisualizationProvider } from './map/base_maps_visualization';
import {
  VectorLayer,
  FileLayerField,
  FileLayer,
  TmsLayer,
  IServiceSettings,
} from './map/service_settings';
// @ts-ignore
import { mapTooltipProvider } from './tooltip_provider';

export function plugin() {
  return new MapsLegacyPlugin();
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
};

// Due to a leaflet/leaflet-draw bug, it's not possible to consume leaflet maps w/ draw control
// through a pipeline leveraging angular. For this reason, client plugins need to
// init kibana map and the basemaps visualization directly rather than consume through
// the usual plugin interface
export function getKibanaMapFactoryProvider(core: CoreSetup) {
  bindSetupCoreAndPlugins(core);
  return (...args: any) => new KibanaMap(...args);
}

export function getBaseMapsVis(core: CoreSetup, serviceSettings: IServiceSettings) {
  const getKibanaMap = getKibanaMapFactoryProvider(core);
  return new BaseMapsVisualizationProvider(getKibanaMap, serviceSettings);
}

export * from './common/types';
export { ORIGIN } from './common/constants/origin';

export { WmsOptions } from './components/wms_options';

export type MapsLegacyPluginSetup = ReturnType<MapsLegacyPlugin['setup']>;
export type MapsLegacyPluginStart = ReturnType<MapsLegacyPlugin['start']>;
