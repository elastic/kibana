/* jshint newcap: false */
define(function (require) {
  'use strict';
  var React = require('vendor/marvel/react/react');
  var Segements = require('../components/segments');
  return function (app) {
    app.directive('segments', function () {
      return {
        restrict: 'E',
        scope: {
          colors: '=colors',
          total: '=total'
        },
        link: function (scope, element) {
          var segments = Segements({ scope: scope });
          React.renderComponent(segments, element[0]);
        }
      };
    });
  };
});


