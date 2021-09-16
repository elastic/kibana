import { CustomIntegrationPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new CustomIntegrationPlugin();
}
export { CustomIntegrationsSetup, CustomIntegrationsStart } from './types';
