define(function (require) {
  var module = require('modules').get('kibana/directives');
  var $ = require('jquery');
  var _ = require('lodash');

  module.directive('fieldName', function ($compile) {
    return {
      restrict: 'A',
      scope: {
        fieldName: '=',
        fieldType: '='
      },
      link: function ($scope, $elem, attrs) {

        var typeIcon = function (fieldType) {
          switch (fieldType)
          {
          case 'source':
            return $('<i class="fa fa-file-text-o"></i> ');
          case 'string':
            return $('<i><strong>t</strong></i> ');
          case 'number':
            return $('<i><strong>#</strong></i> ');
          case 'date':
            return $('<i class="fa fa-clock-o"></i> ');
          case 'ip':
            return $('<i class="fa fa-laptop"></i> ');
          case 'conflict':
            return $('<i class="fa fa-warning"></i> ');
          default:
            return $('<i><strong>?</strong></i> ');
          }
        };

        var icon = typeIcon($scope.fieldType).addClass('text-muted').css({'margin-right': '5px'});

        $elem.text($scope.fieldName).prepend(icon);
      }
    };
  });
});