import _ from 'lodash';
import 'angular-ui-select';
import { uiModules } from 'ui/modules';
import template from './filter_params_editor.html';
import '../directives/ui_select_focus_on';
import '../filters/sort_prefix_first';

const module = uiModules.get('kibana');
module.directive('filterParamsEditor', function ($http) {
  return {
    restrict: 'E',
    template,
    scope: {
      field: '=',
      operator: '=',
      params: '=',
      onChange: '&'
    },
    link: function ($scope) {
      $scope.compactUnion = _.flow(_.union, _.compact);

      $scope.refreshValueSuggestions = (query) => {
        return $scope.getValueSuggestions($scope.field, query)
          .then(suggestions => $scope.valueSuggestions = suggestions);
      };

      $scope.getValueSuggestions = _.memoize(getValueSuggestions, getFieldQueryHash);

      $scope.$watch('operator', (operator) => {
        const type = _.get(operator, 'type');
        if (type === 'phrase' || type === 'phrases') {
          $scope.valueSuggestions = [];
          $scope.refreshValueSuggestions();
        }
      });

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
  };
});
