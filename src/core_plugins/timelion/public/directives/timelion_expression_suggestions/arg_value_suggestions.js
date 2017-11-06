import _ from 'lodash';
import { SavedObjectsClientProvider } from 'ui/saved_objects';

export function ArgValueSuggestionsProvider(Private, indexPatterns) {

  const savedObjectsClient = Private(SavedObjectsClientProvider);

  async function getIndexPattern(functionArgs) {
    const indexPatternArg = functionArgs.find(argument => {
      return argument.name === 'index';
    });
    if (!indexPatternArg) {
      // index argument not provided
      return;
    }
    const indexPatternTitle = _.get(indexPatternArg, 'value.text');

    const resp = await savedObjectsClient.find({
      type: 'index-pattern',
      fields: ['title'],
      search: `"${indexPatternTitle}"`,
      search_fields: ['title'],
      perPage: 10
    });
    const indexPatternSavedObject = resp.savedObjects.find(savedObject => {
      return savedObject.attributes.title === indexPatternTitle;
    });
    if (!indexPatternSavedObject) {
      // index argument does not match an index pattern
      return;
    }

    return await indexPatterns.get(indexPatternSavedObject.id);
  }

  function containsFieldName(partial, field) {
    if (!partial) {
      return true;
    }
    return field.name.includes(partial);
  }

  // Argument value suggestion handlers requiring custom client side code
  // Could not put with function definition since functions are defined on server
  const customHandlers = {
    es: {
      index: async function (partial) {
        const search = partial ? `${partial}*` : '*';
        const resp = await savedObjectsClient.find({
          type: 'index-pattern',
          fields: ['title'],
          search: `${search}`,
          search_fields: ['title'],
          perPage: 25
        });
        return resp.savedObjects.map(savedObject => {
          return { name: savedObject.attributes.title };
        });
      },
      metric: async function (partial, functionArgs) {
        if (!partial || !partial.includes(':')) {
          return [
            { name: 'avg:' },
            { name: 'cardinality:' },
            { name: 'max:' },
            { name: 'min:' },
            { name: 'sum:' }
          ];
        }

        const indexPattern = await getIndexPattern(functionArgs);
        if (!indexPattern) {
          return [];
        }

        const valueSplit = partial.split(':');
        return indexPattern.fields
          .filter(field => {
            return field.aggregatable && 'number' === field.type && containsFieldName(valueSplit[1], field);
          })
          .map(field => {
            return { name: `${valueSplit[0]}:${field.name}`, help: field.type };
          });

      },
      split: async function (partial, functionArgs) {
        const indexPattern = await getIndexPattern(functionArgs);
        if (!indexPattern) {
          return [];
        }

        return indexPattern.fields
          .filter(field => {
            return field.aggregatable
              && ['number', 'boolean', 'date', 'ip', 'string'].includes(field.type)
              && containsFieldName(partial, field);
          })
          .map(field => {
            return { name: field.name, help: field.type };
          });
      },
      timefield: async function (partial, functionArgs) {
        const indexPattern = await getIndexPattern(functionArgs);
        if (!indexPattern) {
          return [];
        }

        return indexPattern.fields
          .filter(field => {
            return 'date' === field.type && containsFieldName(partial, field);
          })
          .map(field => {
            return { name: field.name };
          });
      }
    }
  };

  /**
   * @param {string} argName - user provided argument name
   * @param {string} partial - user provided argument value
   * @param {object} help - arugment help definition object fetched from '/api/timelion/functions'
   * @param {string} functionName - user provided function name containing argument
   * @param {object} functionArgs - user provided function arguments parsed ahead of current argument
   * @return {array} array of suggestions
   */
  async function getSuggestions(argName, partial, help, functionName, functionArgs) {
    if (_.has(customHandlers, [functionName, argName])) {
      return await customHandlers[functionName][argName](partial, functionArgs);
    }

    if (_.has(help, 'suggestions')) {
      if (partial) {
        return help.suggestions.filter(suggestion => {
          return suggestion.name.includes(partial);
        });
      }

      return help.suggestions;
    }

    return [];
  }

  return getSuggestions;
}
