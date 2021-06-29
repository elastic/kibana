/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { getQueryService, getShareService } from './services';
import { indexPatterns } from '../../data/public';
import { Vis } from '../../visualizations/public';
import { LegacyMapDeprecationMessage } from '../../maps_legacy/public';

export function getDeprecationMessage(vis: Vis) {
  const title = i18n.translate('tileMap.vis.mapTitle', {
    defaultMessage: 'Coordinate Map',
  });

  async function onClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();

    const locator = getShareService().url.locators.get('MAPS_APP_TILE_MAP_LOCATOR');
    if (!locator) return;

    const query = getQueryService();
    const params: { [key: string]: any } = {
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
      params.geoFieldName = bucketAggs[0].getField()?.name;
    } else if (vis.data.indexPattern) {
      // attempt to default to first geo point field when geohash is not configured yet
      const geoField = vis.data.indexPattern.fields.find((field) => {
        return (
          !indexPatterns.isNestedField(field) && field.aggregatable && field.type === 'geo_point'
        );
      });
      if (geoField) {
        params.geoFieldName = geoField.name;
      }
    }

    const metricAggs = vis.data?.aggs?.byType('metrics');
    if (metricAggs?.length) {
      params.metricAgg = metricAggs[0].type.dslName;
      params.metricFieldName = metricAggs[0].getField()?.name;
    }

    locator.navigate(params);
  }

  return (
    <LegacyMapDeprecationMessage
      isMapsAvailable={!!getShareService().url.locators.get('MAPS_APP_TILE_MAP_LOCATOR')}
      onClick={onClick}
      visualizationLabel={title}
    />
  );
}
