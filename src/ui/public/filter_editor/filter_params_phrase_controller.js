import _ from 'lodash';

export function filterParamsPhraseController($http, $scope) {
  this.compactUnion = _.flow(_.union, _.compact);

  this.refreshValueSuggestions = (query) => {
    return this.getValueSuggestions($scope.field, query)
      .then(suggestions => $scope.valueSuggestions = suggestions);
  };

  this.getValueSuggestions = _.memoize(getValueSuggestions, getFieldQueryHash);

  function getValueSuggestions(field, query) {
    if (!_.get(field, 'aggregatable') || field.type !== 'string') {
      return Promise.resolve([]);
    }

    const params = {
      query,
      field: field.name
    };

    return $http.post(`../api/kibana/suggestions/values/${field.indexPattern.id}`, params)
      .then(response => response.data);
  }

  function getFieldQueryHash(field, query) {
    return `${field.indexPattern.id}/${field.name}/${query}`;
  }
}
