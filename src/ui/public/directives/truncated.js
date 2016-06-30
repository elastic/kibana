import $ from 'jquery';
import truncText from 'trunc-text';
import truncHTML from 'trunc-html';
import uiModules from 'ui/modules';
import truncatedTemplate from 'ui/directives/partials/truncated.html';
import 'ui/filters/trust_as_html';
const module = uiModules.get('kibana');

module.directive('kbnTruncated', function ($compile) {
  return {
    restrict: 'E',
    scope: {
      source: '@',
      length: '@',
      isHtml: '@'
    },
    template: truncatedTemplate,
    link: function ($scope, $element, attrs) {
      const source = $scope.source;
      const max = $scope.length;
      const truncated = $scope.isHtml
        ? truncHTML(source, max).html
        : truncText(source, max);

      $scope.content = truncated;

      if (source === truncated) {
        return;
      }
      $scope.truncated = true;
      $scope.expanded = false;
      $scope.action = 'more';
      $scope.toggle = () => {
        $scope.expanded = !$scope.expanded;
        $scope.content = $scope.expanded ? source : truncated;
        $scope.action = $scope.expanded ? 'less' : 'more';
      };
    }
  };
});
