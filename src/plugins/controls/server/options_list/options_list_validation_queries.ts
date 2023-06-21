/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get, isEmpty } from 'lodash';

import { OptionsListRequestBody } from '../../common/options_list/types';
import { OptionsListValidationAggregationBuilder } from './types';

/**
 * Validation aggregations
 */
export const getValidationAggregationBuilder: () => OptionsListValidationAggregationBuilder =
  () => ({
    buildAggregation: ({ selectedOptions, fieldName }: OptionsListRequestBody) => {
      let selectedOptionsFilters;
      if (selectedOptions) {
        selectedOptionsFilters = selectedOptions.reduce((acc, currentOption) => {
          acc[currentOption] = { match: { [fieldName]: currentOption } };
          return acc;
        }, {} as { [key: string]: { match: { [key: string]: string } } });
      }
      return selectedOptionsFilters && !isEmpty(selectedOptionsFilters)
        ? {
            filters: {
              filters: selectedOptionsFilters,
            },
          }
        : undefined;
    },
    parse: (rawEsResult) => {
      const rawInvalidSuggestions = get(rawEsResult, 'aggregations.validation.buckets');
      return rawInvalidSuggestions && !isEmpty(rawInvalidSuggestions)
        ? Object.keys(rawInvalidSuggestions).filter(
            (key) => rawInvalidSuggestions[key].doc_count === 0
          )
        : [];
    },
  });
