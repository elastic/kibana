import SavedObjectRegistryProvider from 'ui/saved_objects/saved_object_registry';
import 'ui/pager_control';
import 'ui/pager';

import { VisualizeConstants } from '../visualize_constants';
import { VisualizeLandingPageTable } from './visualize_landing_page_table';

import uiModules from 'ui/modules';
const app = uiModules.get('app/visualize', ['react']);
app.directive('visualizeLandingPageTable', function (reactDirective) {
  return reactDirective(VisualizeLandingPageTable);
});

export function VisualizeListingController($injector, $scope) {
  const $filter = $injector.get('$filter');
  const confirmModal = $injector.get('confirmModal');
  const kbnUrl = $injector.get('kbnUrl');
  const Notifier = $injector.get('Notifier');
  const pagerFactory = $injector.get('pagerFactory');
  const Private = $injector.get('Private');
  const timefilter = $injector.get('timefilter');

  timefilter.enabled = false;

  // TODO: Extract this into an external service.
  const services = Private(SavedObjectRegistryProvider).byLoaderPropertiesName;
  const visualizationService = services.visualizations;
  const notify = new Notifier({ location: 'Visualize' });

  const deleteItems = (selectedIds) => {
    return new Promise((resolve, reject) => {
      const doDelete = () => {
        visualizationService.delete(selectedIds)
          .then(() => resolve(true))
          .catch(error => {
            notify.error(error);
            reject();
          });
      };

      confirmModal(
        `Are you sure you want to delete the selected ${VisualizeConstants.SAVED_VIS_TYPE_PLURAL}? This action is irreversible!`,
        {
          confirmButtonText: 'Delete',
          onConfirm: doDelete,
          onCancel: () => resolve(false)
        });
    });
  };

  const updateProps = () => {
    $scope.tableProps = {
      deleteItems,
      fetch: visualizationService.find.bind(visualizationService),
      kbnUrl
    };
  };
  updateProps();
}
