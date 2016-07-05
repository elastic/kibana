import _ from 'lodash';
import PluginsKibanaDashboardComponentsPanelLibVisualizationProvider from 'plugins/kibana/dashboard/components/panel/lib/visualization';
import PluginsKibanaDashboardComponentsPanelLibSearchProvider from 'plugins/kibana/dashboard/components/panel/lib/search';
export default function loadPanelFunction(Private) { // Inject services here
  return function (panel, $scope) { // Function parameters here
    const panelTypes = {
      visualization: Private(PluginsKibanaDashboardComponentsPanelLibVisualizationProvider),
      search: Private(PluginsKibanaDashboardComponentsPanelLibSearchProvider)
    };

    try {
      return panelTypes[panel.type](panel, $scope);
    } catch (e) {
      throw new Error('Loader not found for unknown panel type: ' + panel.type);
    }

  };
};
