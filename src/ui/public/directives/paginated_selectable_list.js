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

      $scope.hits = $scope.list || [];

      $scope.hitCount = $scope.hits.length;

      $scope.makeUrl = function (hit) {
        if ($scope.userMakeUrl) {
          return $scope.userMakeUrl(hit);
        }
        return '#';
      };

      $scope.onSelect = function (hit, $event) {
        if ($scope.userOnSelect) {
          return $scope.userOnSelect(hit, $event);
        }

        var url = $scope.makeUrl(hit);
        if (!url || url === '#' || url.charAt(0) !== '#') return;

        $event.preventDefault();

        // we want the '/path', not '#/path'
        kbnUrl.change(url.substr(1));
      };

      $scope.preventClick = function ($event) {
        $event.preventDefault();
      };

      $scope.$watch('query', function (val) {
        $scope.hits = $filter('filter')($scope.list, val);
        $scope.hitCount = $scope.hits.length;
      });
    }
  };
});
