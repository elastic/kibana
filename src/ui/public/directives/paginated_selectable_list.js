import _ from 'lodash';
import uiModules from 'ui/modules';
import paginatedSelectableListTemplate from 'ui/partials/paginated_selectable_list.html';

const module = uiModules.get('kibana');

module.directive('paginatedSelectableList', function (kbnUrl) {

  return {
    restrict: 'E',
    scope: {
      perPage: '=',
      list: '=',
      userMakeUrl: '=',
      userOnSelect: '='
    },
    template: paginatedSelectableListTemplate,
    controller: function ($scope, $element, $filter) {
      $scope.perPage = $scope.perPage || 10;

      $scope.hits = $scope.list.sort() || [];

      $scope.hitCount = $scope.hits.length;

      /**
       * Boolean that keeps track of whether hits are sorted ascending (true)
       * or descending (false) by title
       * @type {Boolean}
       */
      $scope.isAscending = true;

      /**
       * Sorts saved object finder hits either ascending or descending
       * @param  {Array} hits Array of saved finder object hits
       * @return {Array} Array sorted either ascending or descending
       */
      $scope.sortHits = function (hits) {
        $scope.isAscending = !$scope.isAscending;
        $scope.hits = $scope.isAscending ? hits.sort() : hits.reverse();
      };

      $scope.makeUrl = function (hit) {
        return $scope.userMakeUrl(hit);
      };

      $scope.onSelect = function (hit, $event) {
        return $scope.userOnSelect(hit, $event);
      };

      $scope.$watch('query', function (val) {
        $scope.hits = $filter('filter')($scope.list, val);
        $scope.hitCount = $scope.hits.length;
      });
    }
  };
});
