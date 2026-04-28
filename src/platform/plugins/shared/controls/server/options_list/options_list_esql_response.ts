/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OptionsListDSLControlState } from '@kbn/controls-schemas';

import type { GetESQLSingleColumnValuesSuccess } from '../../common/options_list/get_esql_single_column_values';
import type { OptionsListSuccessResponse } from '../../common/options_list/types';

export const clientSideSearch = (
  value: string | number,
  requestSearchString?: string | undefined,
  searchTechnique?: OptionsListDSLControlState['search_technique']
) => {
  if (!requestSearchString || !searchTechnique) return true;
  const searchString = requestSearchString.toLowerCase();
  const valueToCompare = String(value).toLowerCase();
  switch (searchTechnique) {
    case 'wildcard':
      return valueToCompare.includes(searchString);
    case 'prefix':
      return valueToCompare.startsWith(searchString);
    case 'exact':
      return valueToCompare === searchString;
  }
};

export function esqlColumnValuesToOptionsListResponse(
  result: GetESQLSingleColumnValuesSuccess,
  {
    searchString,
    searchTechnique,
    selectedOptions,
    ignoreValidations,
  }: {
    searchString?: string;
    searchTechnique?: OptionsListDSLControlState['search_technique'];
    selectedOptions?: OptionsListDSLControlState['selected_options'];
    ignoreValidations?: boolean;
  }
): OptionsListSuccessResponse {
  const suggestions = result.values
    .filter((value) => clientSideSearch(value, searchString, searchTechnique))
    .map((value) => ({ value: String(value) }));
  const invalidSelections = ignoreValidations
    ? []
    : selectedOptions?.filter((selection) => !result.values.some((value) => value === selection));
  return {
    suggestions,
    totalCardinality: suggestions.length,
    invalidSelections,
  };
}
