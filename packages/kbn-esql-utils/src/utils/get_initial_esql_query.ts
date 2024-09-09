/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/public';

/**
 * Builds an ES|QL query for the provided dataView
 * If there is @timestamp field in the index, we don't add the WHERE clause
 * If there is no @timestamp and there is a dataView timeFieldName, we add the WHERE clause with the timeFieldName
 * @param dataView
 */
export function getInitialESQLQuery(dataView: DataView): string {
  const hasAtTimestampField = dataView?.fields?.getByName?.('@timestamp')?.type === 'date';
  const timeFieldName = dataView?.timeFieldName;
  const filterByTimeParams =
    !hasAtTimestampField && timeFieldName
      ? ` | WHERE ${timeFieldName} >= ?t_start AND ${timeFieldName} <= ?t_end`
      : '';
  return `FROM ${dataView.getIndexPattern()}${filterByTimeParams} | LIMIT 10`;
}
