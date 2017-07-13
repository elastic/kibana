import { SavedObjectRegistryProvider } from 'ui/saved_objects/saved_object_registry';
import './saved_dashboards';

SavedObjectRegistryProvider.register((savedDashboards) => {
  return savedDashboards;
});
