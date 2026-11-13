/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esqlColumnValuesToOptionsListResponse } from '../../../../common/options_list/esql_response';
import { getESQLSingleColumnValues } from '../../../../common/options_list/get_esql_single_column_values';
import type {
  OptionsListESQLFetchBody,
  OptionsListResponse,
} from '../../../../common/options_list/types';
import { dataService } from '../../../services/kibana_services';
import { getControlsTimezone } from '../../utils';

/**
 * Runs the ES|QL request of an options list from the browser, as the ES|QL controls do, so that
 * aborting it cancels the query in Elasticsearch.
 */
export const fetchEsqlOptions = async (
  {
    esql,
    timeRange,
    filter,
    esqlVariables,
    sort,
    searchString,
    searchTechnique,
    selectedOptions,
    ignoreValidations,
    projectRouting,
  }: OptionsListESQLFetchBody,
  abortSignal: AbortSignal
): Promise<OptionsListResponse> => {
  const result = await getESQLSingleColumnValues({
    query: esql,
    search: dataService.search.search,
    signal: abortSignal,
    timeRange,
    filter,
    esqlVariables: esqlVariables ?? [],
    timezone: getControlsTimezone(),
    projectRouting,
  });
  if (!getESQLSingleColumnValues.isSuccess(result)) {
    return { error: result.errors[0] };
  }
  return esqlColumnValuesToOptionsListResponse(result, {
    searchString,
    searchTechnique,
    selectedOptions,
    ignoreValidations,
    sort,
  });
};
