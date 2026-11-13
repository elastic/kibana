/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { OptionsListDSLControlState } from '@kbn/controls-schemas';

import { esqlColumnValuesToOptionsListResponse } from '../../../../common/options_list/esql_response';
import { getESQLSingleColumnValues } from '../../../../common/options_list/get_esql_single_column_values';
import type { OptionsListResponse } from '../../../../common/options_list/types';
import { dataService } from '../../../services/kibana_services';

/**
 * The request of the options of a field of an ES|QL source. It is run from the browser, so that
 * aborting it cancels the query in Elasticsearch, which a request to the server route does not.
 */
export interface OptionsListEsqlSourceFetchBody {
  kind: 'esql-source';
  fieldName: string;
  esql: string;
  /** The dashboard filters and the search of the control, as the DSL filter of the ES|QL request. */
  filter?: estypes.QueryDslQueryContainer;
  sort?: OptionsListDSLControlState['sort'];
  selectedOptions?: OptionsListDSLControlState['selected_options'];
  ignoreValidations?: boolean;
  isReload?: boolean;
  projectRouting?: string;
}

export const fetchEsqlSourceOptions = async (
  {
    esql,
    filter,
    sort,
    selectedOptions,
    ignoreValidations,
    projectRouting,
  }: OptionsListEsqlSourceFetchBody,
  abortSignal: AbortSignal
): Promise<OptionsListResponse> => {
  const result = await getESQLSingleColumnValues({
    query: esql,
    search: dataService.search.search,
    signal: abortSignal,
    filter,
    esqlVariables: [],
    projectRouting,
  });
  if (!getESQLSingleColumnValues.isSuccess(result)) {
    return { error: result.errors[0] };
  }
  // the search is already in the filter of the request, so it is not applied again to the values
  return esqlColumnValuesToOptionsListResponse(result, {
    sort,
    selectedOptions,
    ignoreValidations,
  });
};
