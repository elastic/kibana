import { SavedObjectRegistryProvider } from 'ui/saved_objects/saved_object_registry';

SavedObjectRegistryProvider.register((savedVisualizations) => {
  return savedVisualizations;
});
