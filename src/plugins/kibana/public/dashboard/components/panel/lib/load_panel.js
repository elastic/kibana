define(function (require) {
  const _ = require('lodash');
  return function loadPanelFunction(Private) { // Inject services here
    return function (panel, $scope) { // Function parameters here
      const panelTypes = {
        visualization: Private(require('plugins/kibana/dashboard/components/panel/lib/visualization')),
        search: Private(require('plugins/kibana/dashboard/components/panel/lib/search'))
      };

      try {
        return panelTypes[panel.type](panel, $scope);
      } catch (e) {
        throw new Error('Loader not found for unknown panel type: ' + panel.type);
      }

    };
  };
});
