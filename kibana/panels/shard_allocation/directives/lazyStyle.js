/**
 * ELASTICSEARCH CONFIDENTIAL
 * _____________________________
 *
 *  [2014] Elasticsearch Incorporated All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Elasticsearch Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Elasticsearch Incorporated
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Elasticsearch Incorporated.
 */



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
