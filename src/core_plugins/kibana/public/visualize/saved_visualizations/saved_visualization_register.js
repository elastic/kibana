import { SavedObjectRegistryProvider } from 'ui/saved_objects/saved_object_registry';
import './saved_visualizations';

SavedObjectRegistryProvider.register((savedVisualizations) => {
  return savedVisualizations;
});
