import $ from 'jquery';

import chromeNavControlsRegistry from 'ui/registry/chrome_nav_controls';
import chromeConfigControlsRegistry from 'ui/registry/chrome_config_controls';
import UiModules from 'ui/modules';

export default function (chrome, internals) {

  UiModules
  .get('kibana')
  .directive('kbnChromeAppendNavControls', function (Private) {
    return {
      template: function ($element) {
        const parts = [$element.html()];
        const controls = Private(chromeNavControlsRegistry);
        const configs = Private(chromeConfigControlsRegistry);

        for (const control of controls.inOrder) {
          parts.unshift(
            `<!-- nav control ${control.name} -->`,
            control.template
          );
        }

        for (const control of configs.inOrder) {
          const controlHtml = `<render-directive definition="configs['${control.name}'].navbar">
            ${control.navbar.template}
          </render-directive>`;
          parts.unshift(
            `<!-- nav control ${control.name} -->`,
            controlHtml
          );
        }

        return parts.join('\n');
      },
      controller: function ($scope) {
        $scope.configs = Private(chromeConfigControlsRegistry).byName;
      }
    };
  });

}
