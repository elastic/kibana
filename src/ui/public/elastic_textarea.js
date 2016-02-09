import _ from 'lodash';
import uiModules from 'ui/modules';
var NL_RE = /\n/g;
var events = 'keydown keypress keyup change';

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
