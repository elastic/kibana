import _ from 'lodash';
import chrome from 'ui/chrome';

const baseUrl = chrome.addBasePath('/api/kibana/suggestions/values');

export function filterParamsPhraseController($http, $scope, config) {
  const shouldSuggestValues = this.shouldSuggestValues = config.get('filterEditor:suggestValues');

  this.compactUnion = _.flow(_.union, _.compact);

  this.getValueSuggestions = _.memoize(getValueSuggestions, getFieldQueryHash);

  this.refreshValueSuggestions = (query) => {
    return this.getValueSuggestions($scope.field, query)
      .then(suggestions => $scope.valueSuggestions = suggestions);
  };

  this.refreshValueSuggestions();

  function getValueSuggestions(field, query) {
    if (!shouldSuggestValues || !_.get(field, 'aggregatable') || field.type !== 'string') {
      return Promise.resolve([]);
    }

    const params = {
      query,
      field: field.name
    };

    return $http.post(`${baseUrl}/${field.indexPattern.title}`, params)
      .then(response => response.data)
      .catch(() => []);
  }

  function getFieldQueryHash(field, query) {
    return `${field.indexPattern.id}/${field.name}/${query}`;
  }
}
