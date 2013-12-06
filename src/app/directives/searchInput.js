define([
  'angular',
  'app',
  'underscore'
],
  function (ng, app, _) {
    'use strict';

    ng
      .module('kibana.directives')
      .directive('searchInput', function() {
        return {
          link: function(scope, e, attr) {
            var selectedClass = 'selected-query',
              queryBox = e.find('.search-query')
                .focus(function() {
                  queryBox
                    .data('default-styles', {
                      width: queryBox.closest('search-input').css('width')
                    })
                    .css({
                      width: ng.element('.query-panel').css('width')
                    })
                    .addClass(selectedClass);
                })
                .blur(function() {
                  var data = queryBox.data('default-styles');
                  queryBox
                    .css({
                      width: data.width
                    })
                    .removeClass(selectedClass);
                });
          },
          templateUrl: './app/partials/searchInput.html',
          transclude: true,
          restrict: 'E'
        };
      });
  }
);