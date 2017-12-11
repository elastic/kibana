import { SavedObjectRegistryProvider } from 'ui/saved_objects/saved_object_registry';
import 'ui/pager_control';
import 'ui/pager';
import { uiModules } from 'ui/modules';

import { VisualizeListingTable } from './visualize_listing_table';

const app = uiModules.get('app/visualize', ['ngRoute', 'react']);
app.directive('visualizeListingTable', function (reactDirective) {
  return reactDirective(VisualizeListingTable);
});

export function VisualizeListingController($injector) {
  const Notifier = $injector.get('Notifier');
  const Private = $injector.get('Private');
  const timefilter = $injector.get('timefilter');
  const config = $injector.get('config');

  timefilter.disableAutoRefreshSelector();
  timefilter.disableTimeRangeSelector();

  // TODO: Extract this into an external service.
  const services = Private(SavedObjectRegistryProvider).byLoaderPropertiesName;
  const visualizationService = services.visualizations;
  const notify = new Notifier({ location: 'Visualize' });

  this.fetchItems = (filter) => {
    const isLabsEnabled = config.get('visualize:enableLabs');
    return visualizationService.find(filter, config.get('savedObjects:listingLimit'))
      .then(result => {
        this.totalItems = result.total;
        this.showLimitError = result.total > config.get('savedObjects:listingLimit');
        this.listingLimit = config.get('savedObjects:listingLimit');
        return result.hits.filter(result => (isLabsEnabled || result.type.stage !== 'lab'));
      });
  };

  this.deleteSelectedItems = function deleteSelectedItems(selectedIds) {
    return visualizationService.delete(selectedIds)
      .catch(error => notify.error(error));
  };
}
