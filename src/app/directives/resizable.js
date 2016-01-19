define([
  'angular',
],
function (angular) {
  'use strict';

  angular
    .module('kibana.directives')
    .directive('resizable', function() {
      return {
        restrict: 'A',
        link: function(scope, elem) {

          var getOpts = function() {
            return {
              maxWidth: elem.parent().width(),
              grid: elem.parent().width()/12,
              handles: 'e'
            };
          };

          // Re-render if the window is resized
          angular.element(window).bind('resize', function(){
            elem.resizable(getOpts());
          });

          elem.resizable(getOpts());
          elem.resize(function (event, ui) {
            scope.panel.span = Math.round(((ui.size.width / elem.parent().width()) * 100) * 1.2 / 10);
          });
        }
      };
    });
});
