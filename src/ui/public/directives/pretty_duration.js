import { uiModules } from '../modules';
import { prettyDuration } from '../timepicker/pretty_duration';
const module = uiModules.get('kibana');

module.directive('prettyDuration', function (config) {
  return {
    restrict: 'E',
    scope: {
      from: '=',
      to: '='
    },
    link: function ($scope, $elem) {
      const getConfig = (...args) => config.get(...args);

      function setText(text) {
        $elem.text(text);
        $elem.attr('aria-label', `Current time range is ${text}`);
      }

      function stringify() {
        setText(prettyDuration($scope.from, $scope.to, getConfig));
      }

      $scope.$watch('from', stringify);
      $scope.$watch('to', stringify);

    }
  };
});
