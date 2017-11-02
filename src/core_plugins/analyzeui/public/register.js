import { DevToolsRegistryProvider } from 'ui/registry/dev_tools';

DevToolsRegistryProvider.register(() => ({
  order: 5,
  name: 'analyzeui',
  display: 'Analyze UI',
  url: '#/dev_tools/analyzeui'
}));
