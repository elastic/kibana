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

import { i18n } from '@kbn/i18n';
import { UiSettingsParams } from 'kibana/server';
import { schema } from '@kbn/config-schema';

export function getUiSettings(): Record<string, UiSettingsParams<unknown>> {
  return {
    'visualization:tileMap:maxPrecision': {
      name: i18n.translate('maps_legacy.advancedSettings.visualization.tileMap.maxPrecisionTitle', {
        defaultMessage: 'Maximum tile map precision',
      }),
      value: 7,
      description: i18n.translate(
        'maps_legacy.advancedSettings.visualization.tileMap.maxPrecisionText',
        {
          defaultMessage:
            'The maximum geoHash precision displayed on tile maps: 7 is high, 10 is very high, 12 is the max. {cellDimensionsLink}',
          description:
            'Part of composite text: maps_legacy.advancedSettings.visualization.tileMap.maxPrecisionText + ' +
            'maps_legacy.advancedSettings.visualization.tileMap.maxPrecision.cellDimensionsLinkText',
          values: {
            cellDimensionsLink:
              `<a href="http://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-geohashgrid-aggregation.html#_cell_dimensions_at_the_equator"
            target="_blank" rel="noopener">` +
              i18n.translate(
                'maps_legacy.advancedSettings.visualization.tileMap.maxPrecision.cellDimensionsLinkText',
                {
                  defaultMessage: 'Explanation of cell dimensions',
                }
              ) +
              '</a>',
          },
        }
      ),
      schema: schema.number(),
      category: ['visualization'],
    },
    'visualization:tileMap:WMSdefaults': {
      name: i18n.translate('maps_legacy.advancedSettings.visualization.tileMap.wmsDefaultsTitle', {
        defaultMessage: 'Default WMS properties',
      }),
      value: JSON.stringify(
        {
          enabled: false,
          url: '',
          options: {
            version: '',
            layers: '',
            format: 'image/png',
            transparent: true,
            attribution: '',
            styles: '',
          },
        },
        null,
        2
      ),
      type: 'json',
      description: i18n.translate(
        'maps_legacy.advancedSettings.visualization.tileMap.wmsDefaultsText',
        {
          defaultMessage:
            'Default {propertiesLink} for the WMS map server support in the coordinate map',
          description:
            'Part of composite text: maps_legacy.advancedSettings.visualization.tileMap.wmsDefaultsText + ' +
            'maps_legacy.advancedSettings.visualization.tileMap.wmsDefaults.propertiesLinkText',
          values: {
            propertiesLink:
              '<a href="http://leafletjs.com/reference.html#tilelayer-wms" target="_blank" rel="noopener noreferrer">' +
              i18n.translate(
                'maps_legacy.advancedSettings.visualization.tileMap.wmsDefaults.propertiesLinkText',
                {
                  defaultMessage: 'properties',
                }
              ) +
              '</a>',
          },
        }
      ),
      schema: schema.object({
        enabled: schema.boolean(),
        url: schema.string(),
        options: schema.object({
          version: schema.string(),
          layers: schema.string(),
          format: schema.string(),
          transparent: schema.boolean(),
          attribution: schema.string(),
          styles: schema.string(),
        }),
      }),
      category: ['visualization'],
    },
  };
}
