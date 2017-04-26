import 'plugins/kibana/dashboard/saved_dashboard/saved_dashboard';
import { uiModules } from 'ui/modules';
import { SavedObjectLoader } from 'ui/courier/saved_object/saved_object_loader';
import { savedObjectManagementRegistry } from 'plugins/kibana/management/saved_object_registry';

const module = uiModules.get('app/dashboard');

// Register this service with the saved object registry so it can be
// edited by the object editor.
savedObjectManagementRegistry.register({
  service: 'savedDashboards',
  title: 'dashboards'
});

// This is the only thing that gets injected into controllers
module.service('savedDashboards', function (SavedDashboard, kbnIndex, esAdmin, kbnUrl) {
  return new SavedObjectLoader(SavedDashboard, kbnIndex, esAdmin, kbnUrl);
});
