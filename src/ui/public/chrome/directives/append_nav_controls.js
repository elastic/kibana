import _ from 'lodash';

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
        const navs = Private(chromeNavControlsRegistry);
        const configs = Private(chromeConfigControlsRegistry);

        const controls = [
          ...navs.map(function (nav) {
            return {
              template: `<!-- nav control ${nav.name} -->${nav.template}`,
              order: nav.order
            };
          }),

          ...configs.map(function (config) {
            const configHtml = `<render-directive definition="configs['${config.name}'].navbar">
              ${config.navbar.template}
            </render-directive>`;
            return {
              template: `<!-- nav control ${config.name} -->${configHtml}`,
              order: config.order
            };
          }),
        ];

        _.sortBy(controls, 'order').forEach(function (control) {
          parts.unshift(control.template);
        });

        return parts.join('\n');
      },
      controller: function ($scope) {
        $scope.configs = Private(chromeConfigControlsRegistry).byName;
      }
    };
  });

}
