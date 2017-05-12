import { isArray } from 'lodash';
import { uiModules } from 'ui/modules';
import angular from 'angular';

import template from './injected_items.html';
import './injected_items.less';

function makeAngularParseableExpression(item) {
  return `<div class="injected-items-item">${item}&nbsp;</div>`;
}

const app = uiModules.get('kibana');

app.directive('injectedItems', function ($injector) {
  const $compile = $injector.get('$compile');

  return {
    restrict: 'E',
    replace: true,
    template: template,
    scope: {
      items: '='
    },
    link: ($scope, $el) => {
      const items = $scope.items;

      if (isArray(items) && items.length > 0) {
        items.forEach(item => {
          // Compile itemHtml with current $scope and append it into the container DOM element.
          // We do this because we want to dynamically inject content (strings) into the DOM. This content
          // may contain Angular directives so it must first be $compiled with the current $scope.
          const itemHtml = $compile(makeAngularParseableExpression(item))($scope);
          angular.element($el).append(itemHtml);
        });
      }
    }
  };
});
