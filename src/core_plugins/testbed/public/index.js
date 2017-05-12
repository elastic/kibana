import './testbed';


import './components/blahblah';
import { GettingStartedRegistryProvider } from 'ui/getting_started/registry';
import { GETTING_STARTED_REGISTRY_TYPES } from 'ui/getting_started/constants';

GettingStartedRegistryProvider.register(() => ({
  type: GETTING_STARTED_REGISTRY_TYPES.TOP_MESSAGE,
  template: `<blahblah></blahblah>`
}));
GettingStartedRegistryProvider.register(() => ({
  type: GETTING_STARTED_REGISTRY_TYPES.TOP_MESSAGE,
  template: `Nam hendrerit augue id egestas ultricies.`
}));

GettingStartedRegistryProvider.register(() => ({
  type: GETTING_STARTED_REGISTRY_TYPES.MANAGE_AND_MONITOR_MESSAGE,
  template: `Lorem ipsum dolor sit amet, consectetur <a href="http://www.google.com">consectetur</a> adipiscing elit.`
}));

GettingStartedRegistryProvider.register(() => ({
  type: GETTING_STARTED_REGISTRY_TYPES.MANAGE_AND_MONITOR_MESSAGE,
  template: `Nam luctus mattis urna, ac <a href="http://www.google.com">fringilla</a> tellus efficitur at.`
}));
