/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { AggregateQuery, Query } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { queryCannotBeSampled } from '@kbn/esql-utils';

const FIELD_STATISTICS_LABEL = i18n.translate('unifiedFieldList.fieldStats.fieldStatisticsLabel', {
  defaultMessage: `Field statistics are`,
});

export const FIELD_DATA_LABEL = i18n.translate('unifiedFieldList.fieldStats.fieldDataLabel', {
  defaultMessage: `Field data is`,
});

export const getReasonIfFieldDataUnavailableForQuery = (
  query?: AggregateQuery | Query | { [key: string]: any }
): string | undefined => {
  if (queryCannotBeSampled(query)) {
    return i18n.translate('unifiedFieldList.fieldStats.notAvailableForMatchESQLQueryDescription', {
      defaultMessage: `Field data is not available for ES|QL queries with 'MATCH' or 'QSTR' functions.`,
    });
  }
};
