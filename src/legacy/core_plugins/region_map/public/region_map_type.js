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
import React from 'react';
import { i18n } from '@kbn/i18n';
import { Schemas } from 'ui/vis/editors/default/schemas';
import { colorSchemas } from 'ui/vislib/components/color/truncated_colormaps';
import { mapToLayerWithId } from './util';
import { createRegionMapVisualization } from './region_map_visualization';
import { Status } from 'ui/vis/update_status';
import { RegionMapOptions } from './components/region_map_options';

import { visFactory } from '../../visualizations/public';

// TODO: reference to TILE_MAP plugin should be removed
import { ORIGIN } from '../../tile_map/common/origin';

export function createRegionMapTypeDefinition(dependencies) {
  const { uiSettings, regionmapsConfig, serviceSettings } = dependencies;
  const visualization = createRegionMapVisualization(dependencies);

  return visFactory.createBaseVisualization({
    name: 'region_map',
    title: i18n.translate('regionMap.mapVis.regionMapTitle', { defaultMessage: 'Region Map' }),
    description: i18n.translate('regionMap.mapVis.regionMapDescription', {
      defaultMessage:
        'Show metrics on a thematic map. Use one of the \
provided base maps, or add your own. Darker colors represent higher values.',
    }),
    icon: 'visMapRegion',
    visConfig: {
      defaults: {
        legendPosition: 'bottomright',
        addTooltip: true,
        colorSchema: 'Yellow to Red',
        emsHotLink: '',
        isDisplayWarning: true,
        wms: uiSettings.get('visualization:tileMap:WMSdefaults'),
        mapZoom: 2,
        mapCenter: [0, 0],
        outlineWeight: 1,
        showAllShapes: true, //still under consideration
      },
    },
    requiresUpdateStatus: [Status.AGGS, Status.PARAMS, Status.RESIZE, Status.DATA, Status.UI_STATE],
    visualization,
    editorConfig: {
      optionsTemplate: props => <RegionMapOptions {...props} serviceSettings={serviceSettings} />,
      collections: {
        colorSchemas,
        vectorLayers: [],
        tmsLayers: [],
      },
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: i18n.translate('regionMap.mapVis.regionMapEditorConfig.schemas.metricTitle', {
            defaultMessage: 'Value',
          }),
          min: 1,
          max: 1,
          aggFilter: [
            'count',
            'avg',
            'sum',
            'min',
            'max',
            'cardinality',
            'top_hits',
            'sum_bucket',
            'min_bucket',
            'max_bucket',
            'avg_bucket',
          ],
          defaults: [{ schema: 'metric', type: 'count' }],
        },
        {
          group: 'buckets',
          name: 'segment',
          title: i18n.translate('regionMap.mapVis.regionMapEditorConfig.schemas.segmentTitle', {
            defaultMessage: 'Shape field',
          }),
          min: 1,
          max: 1,
          aggFilter: ['terms'],
        },
      ]),
    },
    setup: async savedVis => {
      const vis = savedVis.vis;

      const tmsLayers = await serviceSettings.getTMSServices();
      vis.type.editorConfig.collections.tmsLayers = tmsLayers;
      if (!vis.params.wms.selectedTmsLayer && tmsLayers.length) {
        vis.params.wms.selectedTmsLayer = tmsLayers[0];
      }

      const vectorLayers = regionmapsConfig.layers.map(
        mapToLayerWithId.bind(null, ORIGIN.KIBANA_YML)
      );
      let selectedLayer = vectorLayers[0];
      let selectedJoinField = selectedLayer ? selectedLayer.fields[0] : null;
      if (regionmapsConfig.includeElasticMapsService) {
        const layers = await serviceSettings.getFileLayers();
        const newLayers = layers
          .map(mapToLayerWithId.bind(null, ORIGIN.EMS))
          .filter(
            layer => !vectorLayers.some(vectorLayer => vectorLayer.layerId === layer.layerId)
          );

        // backfill v1 manifest for now
        newLayers.forEach(layer => {
          if (layer.format === 'geojson') {
            layer.format = {
              type: 'geojson',
            };
          }
        });

        vis.type.editorConfig.collections.vectorLayers = [...vectorLayers, ...newLayers];

        [selectedLayer] = vis.type.editorConfig.collections.vectorLayers;
        selectedJoinField = selectedLayer ? selectedLayer.fields[0] : null;

        if (selectedLayer && !vis.params.selectedLayer && selectedLayer.isEMS) {
          vis.params.emsHotLink = await serviceSettings.getEMSHotLink(selectedLayer);
        }
      }

      if (!vis.params.selectedLayer) {
        vis.params.selectedLayer = selectedLayer;
        vis.params.selectedJoinField = selectedJoinField;
      }

      return savedVis;
    },
  });
}
