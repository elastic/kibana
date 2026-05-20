import type { KibanaPluginServiceFactory } from '../types';
import type { CustomIntegrationsPlatformService } from '../platform';
import type { CustomIntegrationsStartDependencies } from '../../types';
/**
 * A type definition for a factory to produce the `CustomIntegrationsPlatformService` for use in Kibana.
 */
export type CustomIntegrationsPlatformServiceFactory = KibanaPluginServiceFactory<CustomIntegrationsPlatformService, CustomIntegrationsStartDependencies>;
/**
 * A factory to produce the `CustomIntegrationsPlatformService` for use in Kibana.
 */
export declare const platformServiceFactory: CustomIntegrationsPlatformServiceFactory;
