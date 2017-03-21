import angular from 'angular';
import { isEmpty } from 'lodash';

import template from 'ui/filter_editor/filter_editor.html';

import uiModules from 'ui/modules';
var module = uiModules.get('kibana');

/**
 * Notes:
 *
 * Order is not preserved due to the bool filter API
 */

module.directive('filterEditor', function ($route, courier) {

  return {
    restrict: 'E',
    template: template,
    scope: {
      filter: '=',
      indexPattern: '='
    },

    link: function ($scope) {
      $scope.indexFields = {};
      $scope.indexFieldNames = [];

      courier.indexPatterns.get($scope.indexPattern).then(function (index) {
        $scope.indexFields = index.fields.reduce(function (fields, field) {
          if (field.filterable === true) {
            fields[field.name] = field.type;
          }

          return fields;
        }, {});

        $scope.indexFieldNames = Object.keys($scope.indexFields).sort();
      });

      $scope.clauses = { must: 'must', must_not: 'must_not', should: 'should' };
      $scope.types = { match: 'keyword', term: 'exact' };

      ensureBoolFilters();

      /**
       * Adds a filter expression
       *
       * @param {string} clause - must, must_not, should
       * @param {string} expression
       */

      $scope.add = function addFilter(clause = 'should', expression) {
        if (!expression) {
          expression = { match: {} };
          expression.match[$scope.indexFieldNames[0]] = '';
        }

        // ensure clause exists as an array
        if (!($scope.filter.bool[clause] instanceof Array)) {
          $scope.filter.bool[clause] = [];
        }

        $scope.filter.bool[clause].push(angular.copy(expression));
      };

      /**
       * Removes a filter expression
       *
       * @param {string} clause - must, must_not, should
       * @param {integer} index - index of position within clause
       */

      $scope.remove = function removeFilter(clause, index) {
        $scope.filter.bool[clause].splice(index, 1);

        // removes clause when no more expressions exist
        if (isEmpty($scope.filter.bool[clause])) {
          delete $scope.filter.bool[clause];
        }
      };

      /**
       * Changes the clause
       *
       * @param {string} fromClause
       * @param {string} toClause
       * @param {object} expression
       */

      $scope.changeClause = function changeClause(fromClause, toClause, expression) {
        for (let i = 0; i <= $scope.filter.bool[fromClause].length; i++) {
          if (angular.equals($scope.filter.bool[fromClause][i], expression)) {
            $scope.remove(fromClause, i);
            $scope.add(toClause, expression);

            break;
          }
        }
      };

      /**
       * Changes the field for an expression
       *
       * @param {string} name
       * @param {object} expression
       */

      $scope.changeField = function changeField(name, expression) {
        let type = Object.keys(expression)[0];
        let prevField = Object.keys(expression[type])[0];
        let filterType;

        filterType = Object.keys(expression)[0];

        expression[filterType][name] = expression[filterType][prevField];
        delete expression[filterType][prevField];
      };

      /**
       * Changes the filter type (match|term)
       *
       * @param {string} toType
       * @param {object} expression
       */

      $scope.changeFilterType = function changeFilterType(toType, expression) {
        let fromType = Object.keys(expression)[0];
        let field = Object.keys(expression[fromType])[0];

        if (fromType === toType) {
          return;
        }

        expression[toType] = {};

        if (toType === 'term' && typeof expression[fromType][field] === 'object') {
          // term filters do not have options
          expression[toType][field] = expression[fromType][field].query;
        } else {
          expression[toType][field] = expression[fromType][field];
        }

        delete expression[fromType];
      };

      function ensureBoolFilters() {
        if ($scope.filter.query) {
          $scope.filter = {
            bool: {
              must: [
                $scope.filter.query
              ]
            }
          };
        }
      }
    }
  };
});
