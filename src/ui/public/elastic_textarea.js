import _ from 'lodash';
import uiModules from 'ui/modules';
let NL_RE = /\n/g;
let events = 'keydown keypress keyup change';

uiModules.get('kibana')
.directive('elasticTextarea', function () {
  return {
    restrict: 'A',
    link: function ($scope, $el) {

      function resize() {
        $el.attr('rows', _.size($el.val().match(NL_RE)) + 1);
      }

      $el.on(events, resize);
      $scope.$evalAsync(resize);
      $scope.$on('$destroy', function () {
        $el.off(events, resize);
      });

    }
  };

});
