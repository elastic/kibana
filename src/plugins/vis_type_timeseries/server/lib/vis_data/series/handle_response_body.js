/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { buildProcessorFunction } from '../build_processor_function';
import { processors } from '../response_processors/series';
import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import { createFieldsFetcher } from './../helpers/fields_fetcher';

export function handleResponseBody(panel, req, searchStrategy, capabilities) {
  return async (resp) => {
    if (resp.error) {
      const err = new Error(resp.error.type);
      err.response = JSON.stringify(resp);
      throw err;
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

    const extractFields = createFieldsFetcher(req, searchStrategy, capabilities);

    const processor = buildProcessorFunction(processors, resp, panel, series, meta, extractFields);

    return await processor([]);
  };
}
