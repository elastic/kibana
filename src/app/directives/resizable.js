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
<<<<<<< HEAD
<<<<<<< HEAD
=======
          console.log('linked');
>>>>>>> Add drag to resize panel widths. Closes #329
=======
>>>>>>> Removing console.log message

          var getOpts = function() {
            return {
              maxWidth: elem.parent().width(),
<<<<<<< HEAD
<<<<<<< HEAD
              grid: elem.parent().width()/12,
              handles: 'e'
=======
              grid: elem.parent().width()/12
>>>>>>> Add drag to resize panel widths. Closes #329
=======
              grid: elem.parent().width()/12,
              handles: 'e'
>>>>>>> Send render whenever window size changes or a panel is resized
            };
          };

          // Re-render if the window is resized
          angular.element(window).bind('resize', function(){
            elem.resizable(getOpts());
          });

          elem.resizable(getOpts());
          elem.resize(function (event, ui) {
<<<<<<< HEAD
<<<<<<< HEAD
            scope.panel.span = Math.round(((ui.size.width / elem.parent().width()) * 100) * 1.2 / 10);
=======
            scope.panel.span = Math.round(((ui.size.width / elem.parent().width()) * 100) * 1.2) / 10;
=======
            scope.panel.span = Math.round(((ui.size.width / elem.parent().width()) * 100) * 1.2 / 10);
<<<<<<< HEAD
>>>>>>> Fix for possibility of partial spans
            scope.$apply();
>>>>>>> Add drag to resize panel widths. Closes #329
=======
>>>>>>> Remove apply, update version to 3.1.0
          });
        }
      };
    });
});
