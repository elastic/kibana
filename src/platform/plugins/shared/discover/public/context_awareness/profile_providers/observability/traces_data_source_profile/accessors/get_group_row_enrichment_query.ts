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

      // Extract the index pattern from the FROM clause
      const fromMatch = query.esql.match(/^\s*FROM\s+([^|]+)/im);
      const indexPattern = fromMatch?.[1]?.trim();

      if (!indexPattern) {
        return prev?.({ query, groupByField });
      }

      const quotedField = /[^a-zA-Z0-9_.]/.test(groupByField)
        ? `\`${groupByField}\``
        : groupByField;

      return [
        `FROM ${indexPattern}`,
        `| WHERE TO_STRING(processor.event) == "transaction" OR TO_STRING(processor.event) == "span" OR processor.event IS NULL`,
        `| EVAL duration_ms_ecs = CASE(transaction.duration.us IS NOT NULL, TO_DOUBLE(transaction.duration.us) / 1000, span.duration.us IS NOT NULL, TO_DOUBLE(span.duration.us) / 1000, NULL)`,
        `| EVAL duration_ms_otel = ROUND(duration) / 1000 / 1000`,
        `| EVAL duration_ms = COALESCE(TO_LONG(duration_ms_ecs), TO_LONG(duration_ms_otel))`,
        `| EVAL id = COALESCE(transaction.id, span.id)`,
        `| EVAL is_error = CASE(TO_STRING(event.outcome) == "failure", 1, TO_STRING(status.code) == "Error", 1, 0)`,
        `| STATS latency = SPARKLINE(AVG(duration_ms), @timestamp, 20, ?_tstart, ?_tend), errors = SPARKLINE(SUM(is_error), @timestamp, 20, ?_tstart, ?_tend), throughput = SPARKLINE(COUNT(id), @timestamp, 20, ?_tstart, ?_tend) BY ${quotedField}`,
      ].join('\n');
    };
