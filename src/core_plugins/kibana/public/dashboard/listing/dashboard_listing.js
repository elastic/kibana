import SavedObjectRegistryProvider from 'ui/saved_objects/saved_object_registry';
import 'ui/pager_control';
import 'ui/pager';

import { DashboardConstants } from '../dashboard_constants';
import { DashboardLandingPageTable } from './dashboard_landing_page_table';

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

  const deleteItems = (selectedIds) => {
    return new Promise((resolve, reject) => {
      const doDelete = () => {
        dashboardService.delete(selectedIds)
          .then(() => resolve(true))
          .catch(error => {
            notify.error(error);
            reject();
          });
      };

      confirmModal(
        `Are you sure you want to delete the selected ${DashboardConstants.SAVED_VIS_TYPE_PLURAL}? This action is irreversible!`,
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
      fetch: dashboardService.find.bind(dashboardService),
      kbnUrl
    };
  };
  updateProps();
}
