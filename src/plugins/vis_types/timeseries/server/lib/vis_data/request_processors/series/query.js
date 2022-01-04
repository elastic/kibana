/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildEsQuery } from '@kbn/es-query';
import { offsetTime } from '../../offset_time';

export function query(
  req,
  panel,
  series,
  esQueryConfig,
  seriesIndex,
  capabilities,
  uiSettings,
  buildSeriesMetaParams
) {
  return (next) => async (doc) => {
    const { timeField } = await buildSeriesMetaParams();
    const { from, to } = offsetTime(req, series.offset_time);

    doc.size = 0;

    const ignoreGlobalFilter = panel.ignore_global_filter || series.ignore_global_filter;
    const queries = !ignoreGlobalFilter ? req.body.query : [];
    const filters = !ignoreGlobalFilter ? req.body.filters : [];

    doc.query = buildEsQuery(seriesIndex.indexPattern, queries, filters, esQueryConfig);

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
        buildEsQuery(seriesIndex.indexPattern, [panel.filter], [], esQueryConfig)
      );
    }

    if (series.filter) {
      doc.query.bool.must.push(
        buildEsQuery(seriesIndex.indexPattern, [series.filter], [], esQueryConfig)
      );
    }

    return next(doc);
  };
}
