define(function (require) {
  var module = require('modules').get('kibana');
  var $ = require('jquery');
  var _ = require('lodash');

  module.directive('cssTruncate', function ($compile) {
    return {
      restrict: 'A',
      scope: {},
      link: function ($scope, $elem, attrs) {

        $elem.css({
          overflow: 'hidden',
          'white-space': 'nowrap',
          'text-overflow': 'ellipsis',
          'word-break': 'break-all',
        });

        if (!_.isUndefined(attrs.cssTruncateExpandable)) {
          $elem.css({'cursor': 'pointer'});
          $elem.bind('click', function () {
            $scope.toggle();
          });
        }

        $scope.toggle = function () {
          if ($elem.css('white-space') !== 'normal') {
            $elem.css({'white-space': 'normal'});
          } else {
            $elem.css({'white-space': 'nowrap'});
          }
        };

        $scope.$on('$destroy', function () {
          $elem.unbind('click');
          $elem.unbind('mouseenter');
        });
      }
    };
  });
});