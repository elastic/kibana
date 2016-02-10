import $ from 'jquery';

import chromeConfigControlsRegistry from 'ui/registry/chrome_config_controls';
import UiModules from 'ui/modules';
import configControlsHtml from './config_controls.html';

export default function (chrome, internals) {

  UiModules
  .get('kibana')
  .directive('kbnChromeConfigControls', function (Private) {
    const controls = Private(chromeConfigControlsRegistry);
    return {
      restrict: 'E',
      template: configControlsHtml,
      controller: function ($scope) {
        $scope.controls = controls.inOrder;
      }
    };
  });

}
