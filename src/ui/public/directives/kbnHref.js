import UiModules from 'ui/modules';
import chrome from 'ui/chrome';
import { words, camelCase, kebabCase } from 'lodash';

export function kbnUrlDirective(name) {
  const srcAttr = kebabCase(name);
  const attr = kebabCase(words(name).slice(1));

  UiModules
  .get('kibana')
  .directive(name, function (Private) {
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
