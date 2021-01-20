/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
