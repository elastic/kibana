/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import type { FieldFormatsRegistry } from '@kbn/field-formats-plugin/common';
import { IncomingMessage } from 'http';
import type { Panel } from '../../../../common/types';
import { _legacyBuildProcessorFunction } from '../build_processor_function';
import { processors } from '../response_processors/series';
import {
  createFieldsFetcher,
  FieldsFetcherServices,
} from '../../search_strategies/lib/fields_fetcher';
import { VisTypeTimeseriesVisDataRequest } from '../../../types';

export function handleResponseBody(
  panel: Panel,
  req: VisTypeTimeseriesVisDataRequest,
  services: FieldsFetcherServices,
  fieldFormatService: FieldFormatsRegistry
) {
  return async (resp: any) => {
    if (resp.pipe) {
      let body = '';
      const rawResponse = resp as IncomingMessage;
      const streamPromise = new Promise<unknown>((resolve, reject) => {
        rawResponse.on('data', (chunk) => {
          body += chunk.toString(); // Append incoming data chunks
        });

        rawResponse.on('end', () => {
          resolve(JSON.parse(body));
        });

        rawResponse.on('error', (e) => {
          reject(e);
        });
      });

      resp = ((await streamPromise) as Record<string, unknown>).response;
    }
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
