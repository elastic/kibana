/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { DataView } from '@kbn/data-views-plugin/public';

/**
 * Builds an ES|QL query for the provided index or index pattern
 * @param dataView
 */
export function getInitialESQLQuery(dataView: DataView): string {
  const timeFieldName = dataView?.timeFieldName;
  const filterByTimeParams =
    timeFieldName !== '@timestamp'
      ? ` | WHERE ${timeFieldName} >= ?start AND ${timeFieldName} <= ?end`
      : '';
  return `FROM ${dataView.getIndexPattern()}${filterByTimeParams} | LIMIT 10`;
}
