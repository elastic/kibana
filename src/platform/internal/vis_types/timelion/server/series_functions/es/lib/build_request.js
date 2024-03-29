/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import moment from 'moment';
import { buildAggBody } from './agg_body';
import createDateAgg from './create_date_agg';
import { UI_SETTINGS } from '@kbn/data-plugin/server';

export default function buildRequest(config, tlConfig, scriptFields, runtimeFields, timeout) {
  const bool = { must: [] };

  const timeFilter = {
    range: {
      [config.timefield]: {
        gte: moment(tlConfig.time.from).toISOString(),
        lte: moment(tlConfig.time.to).toISOString(),
        format: 'strict_date_optional_time',
      },
    },
  };
  bool.must.push(timeFilter);

  // Use the kibana filter bar filters
  if (config.kibana) {
    bool.filter = _.get(tlConfig, 'request.body.extended.es.filter');
  }

  const aggs = {
    q: {
      meta: { type: 'split' },
      filters: {
        filters: _.chain(config.q)
          .map(function (q) {
            return [q, { query_string: { query: q } }];
          })
          .fromPairs()
          .value(),
      },
      aggs: {},
    },
  };

  let aggCursor = aggs.q.aggs;

  (config.split || []).forEach((clause) => {
    const [field, arg] = clause.split(/:(\d+$)/);
    if (field && arg) {
      const termsAgg = buildAggBody(field, scriptFields);
      termsAgg.size = parseInt(arg, 10);
      aggCursor[field] = {
        meta: { type: 'split' },
        terms: termsAgg,
        aggs: {},
      };
      aggCursor = aggCursor[field].aggs;
    } else {
      throw new Error('`split` requires field:limit');
    }
  });

  _.assign(aggCursor, createDateAgg(config, tlConfig, scriptFields));

  const includeFrozen = Boolean(tlConfig.settings[UI_SETTINGS.SEARCH_INCLUDE_FROZEN]);
  const request = {
    index: config.index,
    ...(includeFrozen ? { ignore_throttled: false } : {}),
    body: {
      query: {
        bool: bool,
      },
      aggs: aggs,
      size: 0,
      runtime_mappings: runtimeFields,
    },
  };

  if (timeout) {
    request.timeout = `${timeout}ms`;
  }

  return {
    params: request,
  };
}
