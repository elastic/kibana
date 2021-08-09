/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { getQueryService, getShareService } from './kibana_services';
import { Vis } from '../../visualizations/public';
import { LegacyMapDeprecationMessage } from '../../maps_legacy/public';

function getEmsLayerId(id: string | number, layerId: string) {
  if (typeof id === 'string') {
    return id;
  }

  // Region maps from 6.x will have numerical EMS id refering to S3 bucket id.
  // In this case, use layerId with contains the EMS layer name.
  const split = layerId.split('.');
  return split.length === 2 ? split[1] : undefined;
}

export function getDeprecationMessage(vis: Vis) {
  const title = i18n.translate('regionMap.mapVis.regionMapTitle', { defaultMessage: 'Region Map' });

  async function onClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();

    const locator = getShareService().url.locators.get('MAPS_APP_REGION_MAP_LOCATOR');
    if (!locator) return;

    const query = getQueryService();
    const params: { [key: string]: any } = {
      label: vis.title ? vis.title : title,
      emsLayerId: vis.params.selectedLayer.isEMS
        ? getEmsLayerId(vis.params.selectedLayer.id, vis.params.selectedLayer.layerId)
        : undefined,
      leftFieldName: vis.params.selectedLayer.isEMS ? vis.params.selectedJoinField.name : undefined,
      colorSchema: vis.params.colorSchema,
      indexPatternId: vis.data.indexPattern?.id,
      indexPatternTitle: vis.data.indexPattern?.title,
      metricAgg: 'count',
      filters: query.filterManager.getFilters(),
      query: query.queryString.getQuery(),
      timeRange: query.timefilter.timefilter.getTime(),
    };

    const bucketAggs = vis.data?.aggs?.byType('buckets');
    if (bucketAggs?.length && bucketAggs[0].type.dslName === 'terms') {
      params.termsFieldName = bucketAggs[0].getField()?.name;
      params.termsSize = bucketAggs[0].getParam('size');
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
      isMapsAvailable={!!getShareService().url.locators.get('MAPS_APP_REGION_MAP_LOCATOR')}
      onClick={onClick}
      visualizationLabel={title}
    />
  );
}
