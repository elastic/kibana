/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import { buildEsQuery } from '@kbn/es-query';
import { overwrite } from '../../helpers';

import type { TableRequestProcessorsFunction } from './types';

export const applyFilters: TableRequestProcessorsFunction =
  ({ panel, esQueryConfig, seriesIndex }) =>
  (next) =>
  (doc) => {
    panel.series.forEach((column) => {
      const hasAggregateByApplied = Boolean(column.aggregate_by && column.aggregate_function);
      let filterSelector = `aggs.pivot.aggs.${column.id}.filter`;

      if (hasAggregateByApplied && column.filter?.query) {
        const originalAggsSelector = `aggs.pivot.aggs.${column.id}.aggs`;
        const originalAggs = get(doc, originalAggsSelector);

        overwrite(doc, originalAggsSelector, {
          column_filter: {
            aggs: originalAggs,
          },
        });

        filterSelector = `${originalAggsSelector}.column_filter.filter`;
      }

      if (column.filter?.query) {
        overwrite(
          doc,
          filterSelector,
          buildEsQuery(seriesIndex.indexPattern || undefined, [column.filter], [], esQueryConfig)
        );
      } else {
        if (!hasAggregateByApplied) {
          overwrite(doc, `${filterSelector}.match_all`, {});
        }
      }
    });

    return next(doc);
  };
