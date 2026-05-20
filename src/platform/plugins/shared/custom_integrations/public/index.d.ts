import type { CustomIntegrationsPlugin } from './plugin';
export declare function plugin(): CustomIntegrationsPlugin;
export type { CustomIntegrationsSetup, CustomIntegrationsStart } from './types';
export { withSuspense, LazyReplacementCard } from './components';
export { filterCustomIntegrations } from './services/find';
