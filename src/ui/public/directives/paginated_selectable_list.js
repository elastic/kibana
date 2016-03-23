import _ from 'lodash';
import uiModules from 'ui/modules';
import paginatedSelectableListTemplate from 'ui/partials/paginated_selectable_list.html';

const module = uiModules.get('kibana');

module.directive('paginatedSelectableList', function (kbnUrl) {

  return {
    restrict: 'E',
    scope: {
      perPage: '=?',
      list: '=',
      listProperty: '=',
      userMakeUrl: '=?',
      userOnSelect: '=?'
    },
    template: paginatedSelectableListTemplate,
    controller: function ($scope, $element, $filter) {
      $scope.perPage = $scope.perPage || 10;
      $scope.hits = $scope.list = _.sortBy($scope.list, accessor);
      $scope.hitCount = $scope.hits.length;

      /**
       * Boolean that keeps track of whether hits are sorted ascending (true)
       * or descending (false)
       * * @type {Boolean}
       */
      $scope.isAscending = true;

      /**
       * Sorts saved object finder hits either ascending or descending
       * @param  {Array} hits Array of saved finder object hits
       * @return {Array} Array sorted either ascending or descending
       */
      $scope.sortHits = function (hits) {
        const sortedList = _.sortBy(hits, accessor);

        $scope.isAscending = !$scope.isAscending;
        $scope.hits = $scope.isAscending ? sortedList : sortedList.reverse();
      };

      $scope.makeUrl = function (hit) {
        if ($scope.userMakeUrl) {
          return $scope.userMakeUrl(hit);
        }
      };

      $scope.onSelect = function (hit, $event) {
        if ($scope.userOnSelect) {
          return $scope.userOnSelect(hit, $event);
        }
      };

      function accessor(val) {
        const prop = $scope.listProperty;
        return prop ? val[prop] : val;
      }
    }
  };
});
