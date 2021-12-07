/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildEsQuery } from '@kbn/es-query';
import { overwrite } from '../../helpers';

import type { TableRequestProcessorsFunction } from './types';

export const applyFilters: TableRequestProcessorsFunction =
  ({ panel, esQueryConfig, seriesIndex }) =>
  (next) =>
  (doc) => {
    const indexPattern = seriesIndex.indexPattern || undefined;

    panel.series.forEach((column) => {
      const hasAggregateByApplied = Boolean(column.aggregate_by && column.aggregate_function);
      const filterSelector = !hasAggregateByApplied
        ? `aggs.pivot.aggs.${column.id}.filter`
        : `aggs.pivot.aggs.${column.id}.aggs.timeseries.aggs.column_filter.filter`;

      if (column.filter?.query) {
        overwrite(
          doc,
          filterSelector,
          buildEsQuery(indexPattern, [column.filter], [], esQueryConfig)
        );
      } else {
        if (!hasAggregateByApplied) {
          overwrite(doc, `${filterSelector}.match_all`, {});
        }
      }
    });

    return next(doc);
  };
