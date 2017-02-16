import SavedObjectRegistryProvider from 'ui/saved_objects/saved_object_registry';
import 'ui/pager_control';
import 'ui/pager';
import { ItemTableState } from 'ui/saved_object_table/item_table_state';
import { ItemTableActions } from 'ui/saved_object_table/item_table_actions';
import { TITLE_COLUMN_ID } from 'ui/saved_object_table/get_title_column';

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
  const itemTableState = new ItemTableState(pagerFactory, VisualizeConstants.EDIT_PATH, kbnUrl);

  const fetchObjects = (filter) => ItemTableActions.doFilter(itemTableState, filter, visualizationService);

  this.deleteItems = function deleteItems(items) {
    const doDelete = () => {
      const selectedIds = items.map(item => item.id);

      visualizationService.delete(selectedIds)
        .then(() => fetchObjects(itemTableState.filter))
        .catch(error => notify.error(error));
    };

    confirmModal(
      'Are you sure you want to delete the selected visualizations? This action is irreversible!',
      {
        confirmButtonText: 'Delete',
        onConfirm: doDelete
      });
  };

  const updateProps = () => {
    $scope.tableProps = {
      itemTableState,
      deleteItems: () => this.deleteItems(itemTableState.selectedItems),
      doFilter: fetchObjects
    };
  };

  $scope.$watch(() => itemTableState.items, () => updateProps());
  $scope.$watch(() => itemTableState.selectedItems, () => updateProps());
  $scope.$watch(() => itemTableState.pageOfItems, () => updateProps());
  updateProps();
  fetchObjects();
}
