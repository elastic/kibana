import { TutorialsRegistryProvider } from 'ui/registry/tutorials';
import { apacheSpecProvider } from './apache';

TutorialsRegistryProvider.register(() => {
  return apacheSpecProvider();
});

