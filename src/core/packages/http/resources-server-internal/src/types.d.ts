import type { IRouter } from '@kbn/core-http-server';
import type { HttpResources } from '@kbn/core-http-resources-server';
/**
 * Allows to configure HTTP response parameters
 * @internal
 */
export interface InternalHttpResourcesPreboot {
    createRegistrar(router: IRouter): HttpResources;
}
/**
 * Allows to configure HTTP response parameters
 * @internal
 */
export type InternalHttpResourcesSetup = InternalHttpResourcesPreboot;
