/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get, forEach, isEmpty } from 'lodash';
import { overwrite } from '../../helpers';

import type { TableRequestProcessorsFunction } from './types';

const isEmptyFilter = (filter: { match_all?: string }) =>
  filter && Boolean(filter.match_all) && isEmpty(filter.match_all);

const hasSiblingPipelineAggregation = (aggs: Record<string, unknown> = {}) =>
  Object.keys(aggs).length > 1;

/* Last query handler in the chain. You can use this handler
 * as the last place where you can modify the "doc" (request body) object before sending it to ES.

 * Important: for Sibling Pipeline aggregation we cannot apply this logic
 *
 */
export const normalizeQuery: TableRequestProcessorsFunction = () => {
  return () => (doc) => {
    const series = get(doc, 'aggs.pivot.aggs') as Array<{
      aggs: Record<string, unknown>;
    }>;
    const normalizedSeries = {};

    forEach(series, (value, seriesId) => {
      const filter = get(value, `filter`);

      if (isEmptyFilter(filter) && !hasSiblingPipelineAggregation(value.aggs)) {
        const agg = get(value, 'aggs.timeseries');
        const meta = {
          ...get(value, 'meta'),
          seriesId,
        };

        overwrite(normalizedSeries, `${seriesId}`, agg);
        overwrite(normalizedSeries, `${seriesId}.meta`, {
          ...meta,
          normalized: true,
        });
      } else {
        overwrite(normalizedSeries, `${seriesId}`, value);
      }
    });

    overwrite(doc, 'aggs.pivot.aggs', normalizedSeries);
    return doc;
  };
};
