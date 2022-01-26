/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import type { Panel } from '../../../../common/types';
import { _legacyBuildProcessorFunction } from '../build_processor_function';
// @ts-expect-error
import { processors } from '../response_processors/series';
import {
  createFieldsFetcher,
  FieldsFetcherServices,
} from '../../search_strategies/lib/fields_fetcher';
import { VisTypeTimeseriesVisDataRequest } from '../../../types';
import type { FieldFormatsRegistry } from '../../../../../../field_formats/common';

export function handleResponseBody(
  panel: Panel,
  req: VisTypeTimeseriesVisDataRequest,
  services: FieldsFetcherServices,
  fieldFormatService: FieldFormatsRegistry
) {
  return async (resp: any) => {
    if (resp.error) {
      throw JSON.stringify(resp);
    }
    const aggregations = get(resp, 'aggregations');
    if (!aggregations) {
      const message = i18n.translate('visTypeTimeseries.series.missingAggregationKeyErrorMessage', {
        defaultMessage:
          'The aggregations key is missing from the response, check your permissions for this request.',
      });
      throw Error(message);
    }
    const keys = Object.keys(aggregations);
    if (keys.length !== 1) {
      throw Error(
        i18n.translate('visTypeTimeseries.series.shouldOneSeriesPerRequestErrorMessage', {
          defaultMessage: 'There should only be one series per request.',
        })
      );
    }
    const [seriesId] = keys;
    const meta = get(resp, `aggregations.${seriesId}.meta`, {});
    const series = panel.series.find((s) => s.id === (meta.seriesId || seriesId));

    const extractFields = createFieldsFetcher(req, services);

    const processor = _legacyBuildProcessorFunction(
      processors,
      resp,
      panel,
      series,
      meta,
      extractFields,
      fieldFormatService,
      services.cachedIndexPatternFetcher,
      req.body.timerange.timezone
    );

    return await processor([]);
  };
}
