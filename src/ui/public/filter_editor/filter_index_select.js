import 'angular-ui-select';
import { uiModules } from 'ui/modules';
import template from './filter_index_select.html';
import '../directives/ui_select_focus_on';
import '../filters/sort_prefix_first';

const module = uiModules.get('kibana');
module.directive('filterIndexSelect', function () {
  return {
    restrict: 'E',
    template,
    scope: {
      indexPatterns: '=',
      indexPattern: '=',
      onSelect: '&'
    },
    link: function ($scope) {
      $scope.$watch('indexPatterns', (indexPatterns) => {
        $scope.indexPatternOptions = indexPatterns.map((indexPattern) => {
          return {
            id: indexPattern.id,
            title: indexPattern.get('title'),
          };
        });
      });

      $scope.selectIndexPattern = function (selectedIndexPattern) {
        const indexPattern = $scope.indexPatterns.find((indexPattern) => {
          return indexPattern.id === selectedIndexPattern.id;
        });

        $scope.onSelect({ indexPattern: indexPattern });
      };
    }
  };
});
