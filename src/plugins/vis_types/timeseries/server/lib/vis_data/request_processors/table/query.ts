/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildEsQuery } from '@kbn/es-query';
import { getTimerange, overwrite } from '../../helpers';
import type { TableRequestProcessorsFunction } from './types';

export const query: TableRequestProcessorsFunction =
  ({ req, panel, esQueryConfig, seriesIndex, buildSeriesMetaParams }) =>
  (next) =>
  async (doc) => {
    const { timeField } = await buildSeriesMetaParams();
    const { from, to } = getTimerange(req);
    const indexPattern = seriesIndex.indexPattern || undefined;

    doc.size = 0;

    const queries = !panel.ignore_global_filter ? req.body.query : [];
    const filters = !panel.ignore_global_filter ? req.body.filters : [];
    doc.query = buildEsQuery(indexPattern, queries, filters, esQueryConfig);

    const boolFilters: unknown[] = [];

    if (timeField) {
      const timerange = {
        range: {
          [timeField]: {
            gte: from.toISOString(),
            lte: to.toISOString(),
            format: 'strict_date_optional_time',
          },
        },
      };

      boolFilters.push(timerange);
    }
    if (panel.filter) {
      boolFilters.push(buildEsQuery(indexPattern, [panel.filter], [], esQueryConfig));
    }

    overwrite(doc, 'query.bool.must', boolFilters);

    return next(doc);
  };
