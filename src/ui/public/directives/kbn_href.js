import { uiModules } from 'ui/modules';
import { words, kebabCase } from 'lodash';

export function kbnUrlDirective(name) {
  const attr = kebabCase(words(name).slice(1));

  uiModules
  .get('kibana')
  .directive(name, function (Private, chrome) {
    return {
      restrict: 'A',
      link: function ($scope, $el, $attr) {
        $attr.$observe(name, function (val) {
          $attr.$set(attr, chrome.addBasePath(val));
        });
      }
    };
  });
}

kbnUrlDirective('kbnHref');
