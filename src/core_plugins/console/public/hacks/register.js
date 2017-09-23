import { DevToolsRegistryProvider } from 'ui/registry/dev_tools';

DevToolsRegistryProvider.register(() => ({
  order: 1,
  name: 'console',
  display: 'Console',
  url: 'app/kibana#/dev_tools/console'
}));
