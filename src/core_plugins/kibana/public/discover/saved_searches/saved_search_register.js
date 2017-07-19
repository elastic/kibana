import { SavedObjectRegistryProvider } from 'ui/saved_objects/saved_object_registry';
import './saved_searches';


SavedObjectRegistryProvider.register((savedSearches) => {
  return savedSearches;
});
