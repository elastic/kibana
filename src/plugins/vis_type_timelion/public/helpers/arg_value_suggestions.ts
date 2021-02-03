/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { get } from 'lodash';
import { getIndexPatterns } from './plugin_services';
import { TimelionFunctionArgs } from '../../common/types';
import {
  IndexPatternField,
  indexPatterns as indexPatternsUtils,
  KBN_FIELD_TYPES,
} from '../../../data/public';

export interface Location {
  min: number;
  max: number;
}

export interface FunctionArg {
  function: string;
  location: Location;
  name: string;
  text: string;
  type: string;
  value: {
    location: Location;
    text: string;
    type: string;
    value: string;
  };
}

const isRuntimeField = (field: IndexPatternField) => Boolean(field.runtimeField);

export function getArgValueSuggestions() {
  const indexPatterns = getIndexPatterns();

  async function getIndexPattern(functionArgs: FunctionArg[]) {
    const indexPatternArg = functionArgs.find(({ name }) => name === 'index');
    if (!indexPatternArg) {
      // index argument not provided
      return;
    }
    const indexPatternTitle = get(indexPatternArg, 'value.text');

    return (await indexPatterns.find(indexPatternTitle)).find(
      (index) => index.title === indexPatternTitle
    );
  }

  function containsFieldName(partial: string, field: { name: string }) {
    if (!partial) {
      return true;
    }
    return field.name.includes(partial);
  }

  // Argument value suggestion handlers requiring custom client side code
  // Could not put with function definition since functions are defined on server
  const customHandlers = {
    es: {
      async index(partial: string) {
        const search = partial ? `${partial}*` : '*';
        const size = 25;

        return (await indexPatterns.find(search, size)).map(({ title }) => ({
          name: title,
        }));
      },
      async metric(partial: string, functionArgs: FunctionArg[]) {
        if (!partial || !partial.includes(':')) {
          return [
            { name: 'avg:' },
            { name: 'cardinality:' },
            { name: 'count' },
            { name: 'max:' },
            { name: 'min:' },
            { name: 'percentiles:' },
            { name: 'sum:' },
          ];
        }

        const indexPattern = await getIndexPattern(functionArgs);
        if (!indexPattern) {
          return [];
        }

        const valueSplit = partial.split(':');
        return indexPattern.fields
          .getByType(KBN_FIELD_TYPES.NUMBER)
          .filter(
            (field) =>
              !isRuntimeField(field) &&
              field.aggregatable &&
              containsFieldName(valueSplit[1], field) &&
              !indexPatternsUtils.isNestedField(field)
          )
          .map((field) => ({ name: `${valueSplit[0]}:${field.name}`, help: field.type }));
      },
      async split(partial: string, functionArgs: FunctionArg[]) {
        const indexPattern = await getIndexPattern(functionArgs);
        if (!indexPattern) {
          return [];
        }

        return indexPattern.fields
          .getAll()
          .filter(
            (field) =>
              !isRuntimeField(field) &&
              field.aggregatable &&
              [
                KBN_FIELD_TYPES.NUMBER,
                KBN_FIELD_TYPES.BOOLEAN,
                KBN_FIELD_TYPES.DATE,
                KBN_FIELD_TYPES.IP,
                KBN_FIELD_TYPES.STRING,
              ].includes(field.type as KBN_FIELD_TYPES) &&
              containsFieldName(partial, field) &&
              !indexPatternsUtils.isNestedField(field)
          )
          .map((field) => ({ name: field.name, help: field.type }));
      },
      async timefield(partial: string, functionArgs: FunctionArg[]) {
        const indexPattern = await getIndexPattern(functionArgs);
        if (!indexPattern) {
          return [];
        }

        return indexPattern.fields
          .getByType(KBN_FIELD_TYPES.DATE)
          .filter(
            (field) =>
              !isRuntimeField(field) &&
              containsFieldName(partial, field) &&
              !indexPatternsUtils.isNestedField(field)
          )
          .map((field) => ({ name: field.name }));
      },
    },
  };

  return {
    /**
     * @param {string} functionName - user provided function name containing argument
     * @param {string} argName - user provided argument name
     * @return {boolean} true when dynamic suggestion handler provided for function argument
     */
    hasDynamicSuggestionsForArgument: <T extends keyof typeof customHandlers>(
      functionName: T,
      argName: keyof typeof customHandlers[T]
    ) => {
      return customHandlers[functionName] && customHandlers[functionName][argName];
    },

    /**
     * @param {string} functionName - user provided function name containing argument
     * @param {string} argName - user provided argument name
     * @param {object} functionArgs - user provided function arguments parsed ahead of current argument
     * @param {string} partial - user provided argument value
     * @return {array} array of dynamic suggestions matching partial
     */
    getDynamicSuggestionsForArgument: async <T extends keyof typeof customHandlers>(
      functionName: T,
      argName: keyof typeof customHandlers[T],
      functionArgs: FunctionArg[],
      partialInput = ''
    ) => {
      // @ts-ignore
      return await customHandlers[functionName][argName](partialInput, functionArgs);
    },

    /**
     * @param {string} partial - user provided argument value
     * @param {array} staticSuggestions - argument value suggestions
     * @return {array} array of static suggestions matching partial
     */
    getStaticSuggestionsForInput: (
      partialInput = '',
      staticSuggestions: TimelionFunctionArgs['suggestions'] = []
    ) => {
      if (partialInput) {
        return staticSuggestions.filter((suggestion) => {
          return suggestion.name.includes(partialInput);
        });
      }

      return staticSuggestions;
    },
  };
}

export type ArgValueSuggestions = ReturnType<typeof getArgValueSuggestions>;
