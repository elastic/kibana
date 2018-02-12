

import _ from 'lodash';
import chrome from 'ui/chrome';

const baseUrl = chrome.addBasePath('/api/kibana/values');

export function filterParamsValuesController($http, $scope, $rootScope) {

  this.getAllFieldValues = getAllFieldValues;


  function getAllFieldValues(field) {

    field = $scope.field;
    if (!_.get(field, 'aggregatable') || field.type !== 'string') {
      return Promise.resolve([]);
    }

    const postParams = {
      field: field.name,
      query: $rootScope.filterState
    };


    // TODO pass the response to the scope so that the build function can pick it up
    $http.post(`${baseUrl}/${field.indexPattern.title}`, postParams)
      .then(response => {
        $scope.$emit('value_event', response.data);
      });
  }
}
