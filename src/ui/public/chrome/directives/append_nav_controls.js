import chromeNavControlsRegistry from 'ui/registry/chrome_nav_controls';
import UiModules from 'ui/modules';

export default function () {

  UiModules
  .get('kibana')
  .directive('kbnChromeAppendNavControls', function (Private) {
    return {
      template: function ($element) {
        const parts = [$element.html()];
        const controls = Private(chromeNavControlsRegistry);

        for (const control of controls.inOrder) {
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
