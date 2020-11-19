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
import React from 'react';
import { UrlGeneratorContract } from 'src/plugins/share/public';
import { getCoreService, getQueryService, getShareService } from './services';
import { indexPatterns } from '../../data/public';
import { Vis } from '../../visualizations/public';
import { LegacyMapDeprecationMessage } from '../../maps_legacy/public';

export function getDeprecationMessage(vis: Vis) {
  let mapsTileMapUrlGenerator: UrlGeneratorContract<'MAPS_APP_TILE_MAP_URL_GENERATOR'> | undefined;
  try {
    mapsTileMapUrlGenerator = getShareService().urlGenerators.getUrlGenerator(
      'MAPS_APP_TILE_MAP_URL_GENERATOR'
    );
  } catch (error) {
    // ignore error thrown when url generator is not available
  }

  const title = i18n.translate('tileMap.vis.mapTitle', {
    defaultMessage: 'Coordinate Map',
  });

  async function onClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();

    const query = getQueryService();
    const createUrlParams: { [key: string]: any } = {
      label: vis.title ? vis.title : title,
      mapType: vis.params.mapType,
      colorSchema: vis.params.colorSchema,
      indexPatternId: vis.data.indexPattern?.id,
      metricAgg: 'count',
      filters: query.filterManager.getFilters(),
      query: query.queryString.getQuery(),
      timeRange: query.timefilter.timefilter.getTime(),
    };

    const bucketAggs = vis.data?.aggs?.byType('buckets');
    if (bucketAggs?.length && bucketAggs[0].type.dslName === 'geohash_grid') {
      createUrlParams.geoFieldName = bucketAggs[0].getField()?.name;
    } else if (vis.data.indexPattern) {
      // attempt to default to first geo point field when geohash is not configured yet
      const geoField = vis.data.indexPattern.fields.find((field) => {
        return (
          !indexPatterns.isNestedField(field) && field.aggregatable && field.type === 'geo_point'
        );
      });
      if (geoField) {
        createUrlParams.geoFieldName = geoField.name;
      }
    }

    const metricAggs = vis.data?.aggs?.byType('metrics');
    if (metricAggs?.length) {
      createUrlParams.metricAgg = metricAggs[0].type.dslName;
      createUrlParams.metricFieldName = metricAggs[0].getField()?.name;
    }

    const url = await mapsTileMapUrlGenerator!.createUrl(createUrlParams);
    getCoreService().application.navigateToUrl(url);
  }

  return (
    <LegacyMapDeprecationMessage
      isMapsAvailable={!!mapsTileMapUrlGenerator}
      onClick={onClick}
      visualizationLabel={title}
    />
  );
}
