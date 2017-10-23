import _ from 'lodash';
import { getTerms } from 'ui/terms/terms';

export function filterParamsPhraseController($scope, config) {
  const shouldSuggestValues = this.shouldSuggestValues = config.get('filterEditor:suggestValues');

  this.compactUnion = _.flow(_.union, _.compact);

  this.getValueSuggestions = (field, query) => {
    if (!shouldSuggestValues) {
      return Promise.resolve([]);
    }

    return getTerms(field, query);
  };

  this.refreshValueSuggestions = (query) => {
    return this.getValueSuggestions($scope.field, query)
      .then(suggestions => $scope.valueSuggestions = suggestions);
  };

  this.refreshValueSuggestions();
}
