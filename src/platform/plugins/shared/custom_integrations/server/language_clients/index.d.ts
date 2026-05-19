import type { CoreSetup } from '@kbn/core/server';
import type { CustomIntegrationRegistry } from '../custom_integration_registry';
export declare function registerLanguageClients(core: CoreSetup, registry: CustomIntegrationRegistry, branch: string): void;
