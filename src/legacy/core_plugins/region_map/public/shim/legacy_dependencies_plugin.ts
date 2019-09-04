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

import chrome from 'ui/chrome';
import { CoreStart, Plugin } from 'kibana/public';
import 'ui/vis/map/service_settings';
import { VectorLayer, ServiceSettings, TmsLayer } from 'ui/vis/map/service_settings';
import { RegionMapsConfig } from '../plugin';

import { mapToLayerWithId } from '../util';
// TODO: reference to TILE_MAP plugin should be removed
import { ORIGIN } from '../../../tile_map/common/origin';

/** @internal */
export interface LegacyDependenciesPluginSetup {
  $injector: any;
  serviceSettings: ServiceSettings;
  regionmapsConfig: RegionMapsConfig;
}

export class LegacyDependenciesPlugin
  implements Plugin<Promise<LegacyDependenciesPluginSetup>, void> {
  constructor(private readonly regionmapsConfig: RegionMapsConfig) {}

  public async setup() {
    const $injector = await chrome.dangerouslyGetActiveInjector();
    // Settings for EMSClient.
    // EMSClient, which currently lives in the tile_map vis,
    //  will probably end up being exposed from the future vis_type_maps plugin,
    //  which would register both the tile_map and the region_map vis plugins.
    const serviceSettings: ServiceSettings = $injector.get('serviceSettings');

    let vectorLayers = this.regionmapsConfig.layers.map(
      mapToLayerWithId.bind(null, ORIGIN.KIBANA_YML)
    );
    let selectedLayer = vectorLayers[0];
    let selectedJoinField = selectedLayer ? selectedLayer.fields[0] : null;
    let emsHotLink = '';

    if (this.regionmapsConfig.includeElasticMapsService) {
      const layers = await serviceSettings.getFileLayers();
      const newLayers = layers
        .map(mapToLayerWithId.bind(null, ORIGIN.EMS))
        .filter(
          (layer: VectorLayer) =>
            !vectorLayers.some(vectorLayer => vectorLayer.layerId === layer.layerId)
        );

      // backfill v1 manifest for now
      newLayers.forEach((layer: VectorLayer) => {
        if (layer.format === 'geojson') {
          layer.format = {
            type: 'geojson',
          };
        }
      });

      vectorLayers = [...vectorLayers, ...newLayers];
      [selectedLayer] = vectorLayers;
      selectedJoinField = selectedLayer ? selectedLayer.fields[0] : null;

      if (selectedLayer.isEMS) {
        emsHotLink = await serviceSettings.getEMSHotLink(selectedLayer);
      }
    }

    const tmsLayers: TmsLayer[] = await serviceSettings.getTMSServices();

    return {
      $injector,
      regionmapsConfig: this.regionmapsConfig,
      serviceSettings,
      visConfig: {
        emsHotLink,
        selectedLayer,
        selectedJoinField,
      },
      collections: {
        vectorLayers,
        tmsLayers,
      },
    } as LegacyDependenciesPluginSetup;
  }

  public start(core: CoreStart) {
    // nothing to do here yet
  }
}
