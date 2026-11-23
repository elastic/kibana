/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLControlVariable } from '@kbn/esql-types';
import { dataService } from '../../services/kibana_services';
import { getESQLSingleColumnValues } from '../../../common/options_list';
import { getControlsTimezone } from '../utils';

/** The name of the single column that an ES|QL values query returns, or the error of the query. */
export const getEsqlColumnName = async (
  query: string | undefined,
  esqlVariables: ESQLControlVariable[]
): Promise<{ fieldName?: string; error?: Error }> => {
  if (!query) return {};
  try {
    const result = await getESQLSingleColumnValues({
      query,
      search: dataService.search.search,
      esqlVariables,
      timeRange: dataService.query.timefilter.timefilter.getTime(),
      timezone: getControlsTimezone(),
    });
    if (!getESQLSingleColumnValues.isSuccess(result)) {
      return { error: result.errors[0] };
    }
    return { fieldName: result.column.name };
  } catch (error) {
    return { error };
  }
};

export const haveSameVariableKeys = (
  prev: ESQLControlVariable[],
  next: ESQLControlVariable[]
): boolean => {
  if (prev.length !== next.length) return false;
  const prevKeys = new Set(prev.map((v) => v.key));
  return next.every((v) => prevKeys.has(v.key));
};
