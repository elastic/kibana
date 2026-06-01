import type { CoreSetup } from '@kbn/core/server';
import type { CustomIntegrationRegistry } from '../custom_integration_registry';
import type { IntegrationCategory } from '../../common';
interface ExternalIntegration {
    id: string;
    title: string;
    icon?: string;
    euiIconName?: string;
    description: string;
    docUrlTemplate: string;
    categories: IntegrationCategory[];
}
export declare const integrations: ExternalIntegration[];
export declare function registerExternalIntegrations(core: CoreSetup, registry: CustomIntegrationRegistry, branch: string): void;
export {};
