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

import { TmsLayer } from 'ui/vis/map/service_settings';
import { MapTypes } from './map_types';

export interface WMSOptions {
  selectedTmsLayer?: TmsLayer;
  enabled: boolean;
  url?: string;
  options: {
    version?: string;
    layers?: string;
    format: string;
    transparent: boolean;
    attribution?: string;
    styles?: string;
  };
}

export interface TileMapVisParams {
  colorSchema: string;
  mapType: MapTypes;
  isDesaturated: boolean;
  addTooltip: boolean;
  heatClusterSize: number;
  legendPosition: 'bottomright' | 'bottomleft' | 'topright' | 'topleft';
  mapZoom: number;
  mapCenter: [number, number];
  wms: WMSOptions;
}
