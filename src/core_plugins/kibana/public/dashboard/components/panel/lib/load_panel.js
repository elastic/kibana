import { visualizationLoaderProvider } from 'plugins/kibana/dashboard/components/panel/lib/visualization';
import { searchLoaderProvider } from 'plugins/kibana/dashboard/components/panel/lib/search';

export function loadPanelProvider(Private) { // Inject services here
  return function (panel, $scope) { // Function parameters here
    const panelTypes = {
      visualization: Private(visualizationLoaderProvider),
      search: Private(searchLoaderProvider)
    };

    try {
      return panelTypes[panel.type](panel, $scope);
    } catch (e) {
      throw new Error('Loader not found for unknown panel type: ' + panel.type);
    }

  };
}
