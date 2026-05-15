/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isOfAggregateQueryType } from '@kbn/es-query';
import type { DataSourceProfileProvider } from '../../../..';

export const getGroupRowEnrichmentQuery: DataSourceProfileProvider['profile']['getGroupRowEnrichmentQuery'] =

    (prev) =>
    ({ query, groupByField }) => {
      if (!isOfAggregateQueryType(query)) {
        return prev?.({ query, groupByField });
      }

      // Find the last STATS command and use everything before it as the base,
      // so all WHERE clauses and filters from the original query are preserved.
      const lastStatsMatch = [...query.esql.matchAll(/\|\s*stats\s/gi)].at(-1);
      if (!lastStatsMatch || lastStatsMatch.index === undefined) {
        return prev?.({ query, groupByField });
      }

      const queryPrefix = query.esql.substring(0, lastStatsMatch.index).trim();
      const quotedField = /[^a-zA-Z0-9_.]/.test(groupByField)
        ? `\`${groupByField}\``
        : groupByField;

      return [
        'SET unmapped_fields="NULLIFY";',
        queryPrefix,
        `| WHERE processor.event == "transaction" OR processor.event IS NULL`,
        `| EVAL duration_ms = COALESCE(TO_DOUBLE(transaction.duration.us) / 1000, ROUND(duration) / 1000 / 1000)`,
        `| EVAL is_error = CASE(event.outcome == "failure", 1, status.code == "Error", 1, 0)`,
        `| STATS latency = SPARKLINE(AVG(duration_ms), @timestamp, 20, ?_tstart, ?_tend), latency_avg = AVG(duration_ms), errors = SPARKLINE(SUM(is_error), @timestamp, 20, ?_tstart, ?_tend), error_count = SUM(is_error), throughput = SPARKLINE(COUNT(transaction.id), @timestamp, 20, ?_tstart, ?_tend), total = COUNT(transaction.id) BY ${quotedField}`,
      ].join('\n');
    };
