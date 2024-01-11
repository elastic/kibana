/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getFieldSubtypeNested } from '@kbn/data-views-plugin/common';
import { get, isEmpty } from 'lodash';

import { OptionsListRequestBody } from '../../common/options_list/types';
import { OptionsListValidationAggregationBuilder } from './types';

/**
 * Validation aggregations
 */
export const getValidationAggregationBuilder: () => OptionsListValidationAggregationBuilder =
  () => ({
    buildAggregation: ({ selectedOptions, fieldName, fieldSpec }: OptionsListRequestBody) => {
      let selectedOptionsFilters;
      if (selectedOptions) {
        selectedOptionsFilters = selectedOptions.reduce((acc, currentOption) => {
          acc[currentOption] = { match: { [fieldName]: String(currentOption) } };
          return acc;
        }, {} as { [key: string]: { match: { [key: string]: string } } });
      }

      if (isEmpty(selectedOptionsFilters ?? [])) {
        return {};
      }

      let validationAggregation: any = {
        validation: {
          filters: {
            filters: selectedOptionsFilters,
          },
        },
      };

      const isNested = fieldSpec && getFieldSubtypeNested(fieldSpec);
      if (isNested) {
        validationAggregation = {
          nestedValidation: {
            nested: {
              path: isNested.nested.path,
            },
            aggs: {
              ...validationAggregation,
            },
          },
        };
      }

      return validationAggregation;
    },
    parse: (rawEsResult, { fieldSpec }) => {
      const isNested = fieldSpec && getFieldSubtypeNested(fieldSpec);
      const rawInvalidSuggestions = get(
        rawEsResult,
        isNested
          ? 'aggregations.nestedValidation.validation.buckets'
          : 'aggregations.validation.buckets'
      );
      return rawInvalidSuggestions && !isEmpty(rawInvalidSuggestions)
        ? Object.keys(rawInvalidSuggestions).filter(
            (key) => rawInvalidSuggestions[key].doc_count === 0
          )
        : [];
    },
  });
