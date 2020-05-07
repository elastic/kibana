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

import { buildProcessorFunction } from '../build_processor_function';
import { processors } from '../response_processors/series';
import { get } from 'lodash';
import { i18n } from '@kbn/i18n';

export function handleResponseBody(panel) {
  return resp => {
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
    const series = panel.series.find(s => s.id === (meta.seriesId || seriesId));
    const processor = buildProcessorFunction(processors, resp, panel, series, meta);

    return processor([]);
  };
}
