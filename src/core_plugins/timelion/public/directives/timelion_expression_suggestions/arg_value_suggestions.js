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

  // Argument value suggestion handlers requiring custom client side code
  // Could not put with function definition since functions are defined on server
  const customHandlers = {
    es: {
      index: async function (partial) {
        const search = partial ? `"${partial}"` : '*';
        const resp = await savedObjectsClient.find({
          type: 'index-pattern',
          fields: ['title'],
          search: `${search}`,
          search_fields: ['title'],
          perPage: 10
        });
        return resp.savedObjects.map(savedObject => {
          return { name: savedObject.attributes.title };
        });
      },
      timefield: async function (partial, functionArgs) {
        const indexPattern = await getIndexPattern(functionArgs);
        if (!indexPattern) {
          return [];
        }

        return indexPattern.fields
          .filter(field => {
            return 'date' === field.type;
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
