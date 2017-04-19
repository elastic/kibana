import { DevToolsRegistryProvider } from 'ui/registry/dev_tools';

DevToolsRegistryProvider.register(() => ({
  order: 1,
  name: 'console',
  display: 'Console',
  url: '#/dev_tools/console'
}));
