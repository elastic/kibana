import _ from 'lodash';

export function ArgValueSuggestionsProvider(Private) {

  /**
   * @param {string} partial - user provided argument value
   * @param {object} help - arugment help definition object fetched from '/api/timelion/functions'
   * @param {string} functionName - user provided function name containing argument
   * @param {object} functionArgs - user provided function arguments parsed ahead of current argument
   * @param {string} argName - user provided argument name
   * @return {array} array of suggestions
   */
  function getSuggestions(partial, help, functionName, functionArgs, argName) {
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
