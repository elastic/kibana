import type { MaybePromise } from '@kbn/utility-types';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { Capabilities } from '@kbn/core-capabilities-common';
/**
 * See {@link CapabilitiesSetup}
 * @public
 */
export type CapabilitiesProvider = () => Partial<Capabilities>;
/**
 * See {@link CapabilitiesSetup}
 * @public
 */
export type CapabilitiesSwitcher = (request: KibanaRequest, uiCapabilities: Capabilities, useDefaultCapabilities: boolean) => MaybePromise<Partial<Capabilities>>;
