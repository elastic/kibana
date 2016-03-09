import $ from 'jquery';

import chromeNavControlsRegistry from 'ui/registry/chrome_nav_controls';
import UiModules from 'ui/modules';
import spinnerHtml from './active_http_spinner.html';

const spinner = {
  name: 'active http requests',
  template: spinnerHtml
};

export default function (chrome, internals) {

  UiModules
  .get('kibana')
  .directive('kbnChromeAppendNavControls', function (Private) {
    return {
      template: function ($element) {
        const parts = [$element.html()];
        const controls = Private(chromeNavControlsRegistry);

        for (const control of [spinner, ...controls.inOrder]) {
          parts.unshift(
            `<!-- nav control ${control.name} -->`,
            control.template
          );
        }

        return parts.join('\n');
      }
    };
  });

}
