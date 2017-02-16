import SavedObjectRegistryProvider from 'ui/saved_objects/saved_object_registry';
import 'ui/pager_control';
import 'ui/pager';

import { DashboardConstants } from '../dashboard_constants';
import { DashboardLandingPageTable } from './dashboard_landing_page_table';
import { ItemTableActions } from 'ui/saved_object_table/item_table_actions';
import { ItemTableState } from 'ui/saved_object_table/item_table_state';

import uiModules from 'ui/modules';
const app = uiModules.get('app/dashboard', ['react']);
app.directive('dashboardLandingPageTable', function (reactDirective) {
  return reactDirective(DashboardLandingPageTable);
});

export function DashboardListingController($injector, $scope) {
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
  const dashboardService = services.dashboards;
  const notify = new Notifier({ location: 'Dashboard' });
  const itemTableState = new ItemTableState(pagerFactory, DashboardConstants.EDIT_PATH, kbnUrl);
  const fetchObjects = (filter) => ItemTableActions.doFilter(itemTableState, filter, dashboardService);

  this.deleteItems = function deleteItems(items) {
    const doDelete = () => {
      const selectedIds = items.map(item => item.id);

      dashboardService.delete(selectedIds)
        .then(() => fetchObjects(itemTableState.filter))
        .catch(error => notify.error(error));
    };

    confirmModal(
      `Are you sure you want to delete the selected ${DashboardConstants.TYPE_NAME_PLURAL}? This action is irreversible!`,
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
