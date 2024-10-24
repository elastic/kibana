/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { AggregateQuery, Query } from '@kbn/es-query';
import { Walker } from '@kbn/esql-ast';
import { parse } from '@kbn/esql-ast';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';

const FIELD_STATISTICS_LABEL = i18n.translate('unifiedFieldList.fieldStats.fieldStatisticsLabel', {
  defaultMessage: `Field statistics are`,
});

export const FIELD_DATA_LABEL = i18n.translate('unifiedFieldList.fieldStats.fieldDataLabel', {
  defaultMessage: `Field data is`,
});

export const getReasonIfFieldStatsUnavailableForQuery = (
  query?: AggregateQuery | Query | { [key: string]: any },
  label: string = FIELD_STATISTICS_LABEL
): string | undefined => {
  if (isOfAggregateQueryType(query)) {
    const { root } = parse(query.esql);

    if (Walker.hasFunction(root, 'match') || Walker.hasFunction(root, 'qstr')) {
      return i18n.translate(
        'unifiedFieldList.fieldStats.notAvailableForMatchESQLQueryDescription',
        {
          defaultMessage: `{label} not supported for ES|QL queries with 'MATCH' or 'QSTR' functions.`,
          values: { label },
        }
      );
    }
  }
};
