import $ from 'jquery';

import chromeConfigControlsRegistry from 'ui/registry/chrome_config_controls';
import UiModules from 'ui/modules';

export default function (chrome, internals) {

  UiModules
  .get('kibana')
  .directive('kbnChromeConfigControls', function (Private) {
    const controls = Private(chromeConfigControlsRegistry);
    return {
      template: require('ui/chrome/directives/config_controls.html'),
      controller: function ($scope) {
        $scope.controls = controls.inOrder;
      }
    };
  });

}
