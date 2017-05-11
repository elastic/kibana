import './testbed';


import './components/blahblah';
import { GettingStartedTopMessagesRegistryProvider } from 'ui/getting_started/top_messages_registry';
import { GettingStartedMonitorAndManageMessagesRegistryProvider } from 'ui/getting_started/monitor_and_manage_messages_registry';

GettingStartedTopMessagesRegistryProvider.register(() => ({
  template: `<blahblah></blahblah>`
}));
GettingStartedTopMessagesRegistryProvider.register(() => ({
  template: `Nam hendrerit augue id egestas ultricies.`
}));

GettingStartedMonitorAndManageMessagesRegistryProvider.register(() => ({
  template: `Lorem ipsum dolor sit amet, consectetur <a href="http://www.google.com">consectetur</a> adipiscing elit.`
}));

GettingStartedMonitorAndManageMessagesRegistryProvider.register(() => ({
  template: `Nam luctus mattis urna, ac <a href="http://www.google.com">fringilla</a> tellus efficitur at.`
}));
