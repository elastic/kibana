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

  let isFetchingItems = true;

  const filter = (filter) => {
    ItemTableActions.filter(itemTableState, filter, dashboardService).then(() => {
      isFetchingItems = false;
    });
  };

  const deleteItems = () => {
    ItemTableActions.deleteSelectedItems(
      itemTableState,
      dashboardService,
      notify,
      confirmModal,
      DashboardConstants.TYPE_NAME_PLURAL);
  };

  const updateProps = () => {
    $scope.tableProps = {
      itemTableState,
      deleteItems,
      filter,
      isFetchingItems
    };
  };

  $scope.$watch(() => itemTableState.items, () => updateProps());
  $scope.$watch(() => itemTableState.selectedItems, () => updateProps());
  $scope.$watch(() => itemTableState.pageOfItems, () => updateProps());
  updateProps();
  filter();
}
