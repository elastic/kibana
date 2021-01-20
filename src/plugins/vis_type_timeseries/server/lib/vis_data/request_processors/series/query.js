/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { offsetTime } from '../../offset_time';
import { getIntervalAndTimefield } from '../../get_interval_and_timefield';
import { esQuery } from '../../../../../../data/server';

export function query(req, panel, series, esQueryConfig, indexPatternObject) {
  return (next) => (doc) => {
    const { timeField } = getIntervalAndTimefield(panel, series, indexPatternObject);
    const { from, to } = offsetTime(req, series.offset_time);

    doc.size = 0;
    const ignoreGlobalFilter = panel.ignore_global_filter || series.ignore_global_filter;
    const queries = !ignoreGlobalFilter ? req.payload.query : [];
    const filters = !ignoreGlobalFilter ? req.payload.filters : [];
    doc.query = esQuery.buildEsQuery(indexPatternObject, queries, filters, esQueryConfig);

    const timerange = {
      range: {
        [timeField]: {
          gte: from.toISOString(),
          lte: to.toISOString(),
          format: 'strict_date_optional_time',
        },
      },
    };
    doc.query.bool.must.push(timerange);

    if (panel.filter) {
      doc.query.bool.must.push(
        esQuery.buildEsQuery(indexPatternObject, [panel.filter], [], esQueryConfig)
      );
    }

    if (series.filter) {
      doc.query.bool.must.push(
        esQuery.buildEsQuery(indexPatternObject, [series.filter], [], esQueryConfig)
      );
    }

    return next(doc);
  };
}
