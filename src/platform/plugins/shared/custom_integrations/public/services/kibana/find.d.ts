import type { KibanaPluginServiceFactory } from '../types';
import type { CustomIntegrationsStartDependencies } from '../../types';
import type { CustomIntegrationsFindService } from '../find';
/**
 * A type definition for a factory to produce the `CustomIntegrationsFindService` for use in Kibana.
 */
export type CustomIntegrationsFindServiceFactory = KibanaPluginServiceFactory<CustomIntegrationsFindService, CustomIntegrationsStartDependencies>;
/**
 * A factory to produce the `CustomIntegrationsFindService` for use in Kibana.
 */
export declare const findServiceFactory: CustomIntegrationsFindServiceFactory;
