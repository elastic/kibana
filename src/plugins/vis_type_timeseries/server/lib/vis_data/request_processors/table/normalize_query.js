/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';
import { overwrite } from '../../helpers';
const isEmptyFilter = (filter = {}) => Boolean(filter.match_all) && _.isEmpty(filter.match_all);
const hasSiblingPipelineAggregation = (aggs = {}) => Object.keys(aggs).length > 1;

/* Last query handler in the chain. You can use this handler
 * as the last place where you can modify the "doc" (request body) object before sending it to ES.

 * Important: for Sibling Pipeline aggregation we cannot apply this logic
 *
 */
export function normalizeQuery() {
  return () => (doc) => {
    const series = _.get(doc, 'aggs.pivot.aggs');
    const normalizedSeries = {};

    _.forEach(series, (value, seriesId) => {
      const filter = _.get(value, `filter`);

      if (isEmptyFilter(filter) && !hasSiblingPipelineAggregation(value.aggs)) {
        const agg = _.get(value, 'aggs.timeseries');
        const meta = {
          ..._.get(value, 'meta'),
          seriesId,
        };
        overwrite(normalizedSeries, `${seriesId}`, agg);
        overwrite(normalizedSeries, `${seriesId}.meta`, meta);
      } else {
        overwrite(normalizedSeries, `${seriesId}`, value);
      }
    });

    overwrite(doc, 'aggs.pivot.aggs', normalizedSeries);

    return doc;
  };
}
