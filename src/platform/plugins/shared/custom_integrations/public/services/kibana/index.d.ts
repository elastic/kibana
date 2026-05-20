import type { CustomIntegrationsServices } from '..';
import type { CustomIntegrationsStartDependencies } from '../../types';
import type { KibanaPluginServiceFactory } from '../types';
export { findServiceFactory } from './find';
export { platformServiceFactory } from './platform';
export declare const servicesFactory: KibanaPluginServiceFactory<CustomIntegrationsServices, CustomIntegrationsStartDependencies>;
