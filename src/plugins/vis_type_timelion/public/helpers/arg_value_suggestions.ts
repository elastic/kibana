/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { get } from 'lodash';
import { getIndexPatterns, getSavedObjectsClient } from './plugin_services';
import { TimelionFunctionArgs } from '../../common/types';
import { indexPatterns as indexPatternsUtils, IndexPatternAttributes } from '../../../data/public';

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

export function getArgValueSuggestions() {
  const indexPatterns = getIndexPatterns();
  const savedObjectsClient = getSavedObjectsClient();

  async function getIndexPattern(functionArgs: FunctionArg[]) {
    const indexPatternArg = functionArgs.find(({ name }) => name === 'index');
    if (!indexPatternArg) {
      // index argument not provided
      return;
    }
    const indexPatternTitle = get(indexPatternArg, 'value.text');

    const { savedObjects } = await savedObjectsClient.find<IndexPatternAttributes>({
      type: 'index-pattern',
      fields: ['title'],
      search: `"${indexPatternTitle}"`,
      searchFields: ['title'],
      perPage: 10,
    });
    const indexPatternSavedObject = savedObjects.find(
      ({ attributes }) => attributes.title === indexPatternTitle
    );
    if (!indexPatternSavedObject) {
      // index argument does not match an index pattern
      return;
    }

    return await indexPatterns.get(indexPatternSavedObject.id);
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
        const resp = await savedObjectsClient.find<IndexPatternAttributes>({
          type: 'index-pattern',
          fields: ['title', 'type'],
          search: `${search}`,
          searchFields: ['title'],
          perPage: 25,
        });
        return resp.savedObjects
          .filter((savedObject) => !savedObject.get('type'))
          .map((savedObject) => {
            return { name: savedObject.attributes.title };
          });
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
          .getAll()
          .filter((field) => {
            return (
              field.aggregatable &&
              'number' === field.type &&
              containsFieldName(valueSplit[1], field) &&
              !indexPatternsUtils.isNestedField(field)
            );
          })
          .map((field) => {
            return { name: `${valueSplit[0]}:${field.name}`, help: field.type };
          });
      },
      async split(partial: string, functionArgs: FunctionArg[]) {
        const indexPattern = await getIndexPattern(functionArgs);
        if (!indexPattern) {
          return [];
        }

        return indexPattern.fields
          .getAll()
          .filter((field) => {
            return (
              field.aggregatable &&
              ['number', 'boolean', 'date', 'ip', 'string'].includes(field.type) &&
              containsFieldName(partial, field) &&
              !indexPatternsUtils.isNestedField(field)
            );
          })
          .map((field) => {
            return { name: field.name, help: field.type };
          });
      },
      async timefield(partial: string, functionArgs: FunctionArg[]) {
        const indexPattern = await getIndexPattern(functionArgs);
        if (!indexPattern) {
          return [];
        }

        return indexPattern.fields
          .getAll()
          .filter((field) => {
            return (
              'date' === field.type &&
              containsFieldName(partial, field) &&
              !indexPatternsUtils.isNestedField(field)
            );
          })
          .map((field) => {
            return { name: field.name };
          });
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
