/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import { isNestedField } from '@kbn/data-views-plugin/common';
import { KBN_FIELD_TYPES } from '@kbn/data-plugin/public';
import { getIndexPatterns } from './plugin_services';
import { TimelionFunctionArgs } from '../../common/types';
import { TimelionExpressionFunction, TimelionExpressionArgument } from '../../common/parser';

export function getArgValueSuggestions() {
  const indexPatterns = getIndexPatterns();

  async function getIndexPattern(functionArgs: TimelionExpressionFunction[]) {
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
  const customHandlers: Record<string, any> = {
    es: {
      async index(partial: string) {
        const search = partial ? `${partial}*` : '*';
        const size = 25;

        return (await indexPatterns.find(search, size)).map(({ title }) => ({
          name: title,
          insertText: title,
        }));
      },
      async metric(partial: string, functionArgs: TimelionExpressionFunction[]) {
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
              field.aggregatable && containsFieldName(valueSplit[1], field) && !isNestedField(field)
          )
          .map((field) => {
            const suggestionValue = field.name.replaceAll(':', '\\:');
            return {
              name: `${valueSplit[0]}:${suggestionValue}`,
              help: field.type,
              insertText: suggestionValue,
            };
          });
      },
      async split(partial: string, functionArgs: TimelionExpressionFunction[]) {
        const indexPattern = await getIndexPattern(functionArgs);
        if (!indexPattern) {
          return [];
        }

        return indexPattern.fields
          .getAll()
          .filter(
            (field) =>
              field.aggregatable &&
              [
                KBN_FIELD_TYPES.NUMBER,
                KBN_FIELD_TYPES.BOOLEAN,
                KBN_FIELD_TYPES.DATE,
                KBN_FIELD_TYPES.IP,
                KBN_FIELD_TYPES.STRING,
              ].includes(field.type as KBN_FIELD_TYPES) &&
              containsFieldName(partial, field) &&
              !isNestedField(field)
          )
          .map((field) => ({ name: field.name, help: field.type, insertText: field.name }));
      },
      async timefield(partial: string, functionArgs: TimelionExpressionFunction[]) {
        const indexPattern = await getIndexPattern(functionArgs);
        if (!indexPattern) {
          return [];
        }

        return indexPattern.fields
          .getByType(KBN_FIELD_TYPES.DATE)
          .filter((field) => containsFieldName(partial, field) && !isNestedField(field))
          .map((field) => ({ name: field.name, insertText: field.name }));
      },
    },
  };

  return {
    /**
     * @param {string} functionName - user provided function name containing argument
     * @param {string} argName - user provided argument name
     * @return {boolean} true when dynamic suggestion handler provided for function argument
     */
    hasDynamicSuggestionsForArgument: (functionName: string, argName: string) => {
      return customHandlers[functionName] && customHandlers[functionName][argName];
    },

    /**
     * @param {string} functionName - user provided function name containing argument
     * @param {string} argName - user provided argument name
     * @param {object} functionArgs - user provided function arguments parsed ahead of current argument
     * @param {string} partial - user provided argument value
     * @return {array} array of dynamic suggestions matching partial
     */
    getDynamicSuggestionsForArgument: async (
      functionName: string,
      argName: string,
      functionArgs: TimelionExpressionArgument[],
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
