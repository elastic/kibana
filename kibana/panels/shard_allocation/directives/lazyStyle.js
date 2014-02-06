// Taken from http://www.royts.com/2013/06/css-lazy-loading-in-angularjs-app.html
define(function () {
  'use strict';
  return function (app) {
    app.directive('lazyStyle', function () {
      var loadedStyles = {};
      return {
        restrict: 'E',
        link: function (scope, element, attrs) {

          attrs.$observe('href', function (value) {

            var stylePath = value;

            if (stylePath in loadedStyles) {
              return;
            }

            if (document.createStyleSheet) {
              document.createStyleSheet(stylePath); //IE
            } else {
              var link = document.createElement("link");
              link.type = "text/css";
              link.rel = "stylesheet";
              link.href = stylePath;
              document.getElementsByTagName("head")[0].appendChild(link);
            }

            loadedStyles[stylePath] = true;

          });
        }
      };
    });
  };
});
