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

import './region_map_vis_params';
import { i18n } from '@kbn/i18n';
import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { Schemas } from 'ui/vis/editors/default/schemas';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { truncatedColorMaps } from 'ui/vislib/components/color/truncated_colormaps';
import { mapToLayerWithId } from './util';
import { RegionMapsVisualizationProvider } from './region_map_visualization';
import { Status } from 'ui/vis/update_status';
import { ORIGIN } from '../../../../legacy/core_plugins/tile_map/common/origin';

VisTypesRegistryProvider.register(function RegionMapProvider(Private, regionmapsConfig, config) {

  const VisFactory = Private(VisFactoryProvider);
  const RegionMapsVisualization = Private(RegionMapsVisualizationProvider);

  const vectorLayers = regionmapsConfig.layers.map(mapToLayerWithId.bind(null, ORIGIN.KIBANA_YML));

  const selectedLayer = vectorLayers[0];
  const selectedJoinField = selectedLayer ? vectorLayers[0].fields[0] : null;

  return VisFactory.createBaseVisualization({
    name: 'region_map',
    title: i18n.translate('regionMap.mapVis.regionMapTitle', { defaultMessage: 'Region Map' }),
    description: i18n.translate('regionMap.mapVis.regionMapDescription', { defaultMessage: 'Show metrics on a thematic map. Use one of the \
provided base maps, or add your own. Darker colors represent higher values.' }),
    icon: 'visMapRegion',
    visConfig: {
      defaults: {
        legendPosition: 'bottomright',
        addTooltip: true,
        colorSchema: 'Yellow to Red',
        selectedLayer: selectedLayer,
        emsHotLink: '',
        selectedJoinField: selectedJoinField,
        isDisplayWarning: true,
        wms: config.get('visualization:tileMap:WMSdefaults'),
        mapZoom: 2,
        mapCenter: [0, 0],
        outlineWeight: 1,
        showAllShapes: true//still under consideration
      }
    },
    requiresUpdateStatus: [Status.AGGS, Status.PARAMS, Status.RESIZE, Status.DATA, Status.UI_STATE],
    visualization: RegionMapsVisualization,
    editorConfig: {
      optionsTemplate: '<region_map-vis-params></region_map-vis-params>',
      collections: {
        legendPositions: [{
          value: 'bottomleft',
          text: i18n.translate('regionMap.mapVis.regionMapEditorConfig.bottomLeftText', { defaultMessage: 'bottom left' }),
        }, {
          value: 'bottomright',
          text: i18n.translate('regionMap.mapVis.regionMapEditorConfig.bottomRightText', { defaultMessage: 'bottom right' }),
        }, {
          value: 'topleft',
          text: i18n.translate('regionMap.mapVis.regionMapEditorConfig.topLeftText', { defaultMessage: 'top left' }),
        }, {
          value: 'topright',
          text: i18n.translate('regionMap.mapVis.regionMapEditorConfig.topRightText', { defaultMessage: 'top right' }),
        }],
        colorSchemas: Object.values(truncatedColorMaps).map(value => ({ id: value.id, label: value.label })),
        vectorLayers: vectorLayers,
        tmsLayers: []
      },
      schemas: new Schemas([
        {
          group: 'metrics',
          name: 'metric',
          title: i18n.translate('regionMap.mapVis.regionMapEditorConfig.schemas.metricTitle', { defaultMessage: 'Value' }),
          min: 1,
          max: 1,
          aggFilter: ['count', 'avg', 'sum', 'min', 'max', 'cardinality', 'top_hits',
            'sum_bucket', 'min_bucket', 'max_bucket', 'avg_bucket'],
          defaults: [
            { schema: 'metric', type: 'count' }
          ]
        },
        {
          group: 'buckets',
          name: 'segment',
          icon: 'fa fa-globe',
          title: i18n.translate('regionMap.mapVis.regionMapEditorConfig.schemas.segmentTitle', { defaultMessage: 'shape field' }),
          min: 1,
          max: 1,
          aggFilter: ['terms']
        }
      ])
    }
  });
});
