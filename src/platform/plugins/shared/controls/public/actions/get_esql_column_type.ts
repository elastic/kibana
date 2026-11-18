/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apiPublishesESQLVariables } from '@kbn/esql-types';

import { getESQLSingleColumnValues } from '../../common/options_list';
import { getControlsTimezone } from '../controls/utils';
import { dataService } from '../services/kibana_services';

// Several control types check compatibility for the same query, so share the in-flight request
let lastRequest: { key: string; columnType: Promise<string | undefined> } | undefined;

/**
 * Runs an ES|QL values query and resolves with the type of its single returned column. Resolves
 * with `undefined` if the query fails or does not return exactly one column.
 */
export const getESQLColumnType = (
  esqlQuery: string,
  parentApi?: unknown
): Promise<string | undefined> => {
  const esqlVariables = apiPublishesESQLVariables(parentApi) ? parentApi.esqlVariables$.value : [];
  const key = JSON.stringify([esqlQuery, esqlVariables]);
  if (lastRequest?.key === key) return lastRequest.columnType;

  const columnType = getESQLSingleColumnValues({
    query: esqlQuery,
    search: dataService.search.search,
    esqlVariables,
    timeRange: dataService.query.timefilter.timefilter.getTime(),
    timezone: getControlsTimezone(),
  }).then((result) =>
    getESQLSingleColumnValues.isSuccess(result) ? result.column.type : undefined
  );
  lastRequest = { key, columnType };
  return columnType;
};
