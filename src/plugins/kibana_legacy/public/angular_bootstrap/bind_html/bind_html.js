/* eslint-disable */

import angular from 'angular';

export function initBindHtml() {
  angular
    .module('ui.bootstrap.bindHtml', [])

    .directive('bindHtmlUnsafe', function() {
      return function(scope, element, attr) {
        element.addClass('ng-binding').data('$binding', attr.bindHtmlUnsafe);
        scope.$watch(attr.bindHtmlUnsafe, function bindHtmlUnsafeWatchAction(value) {
          element.html(value || '');
        });
      };
    });
}
