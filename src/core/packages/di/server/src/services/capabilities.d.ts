import type { ServiceIdentifier } from 'inversify';
import type { CapabilitiesProvider as ICapabilitiesProvider } from '@kbn/core-capabilities-server';
/**
 * Service identifier to register a capabilities provider.
 * @see {@link CapabilitiesSetup}
 * @example
 * ```ts
 * bind(CapabilitiesProvider).toConstantValue(() => {
 *   something: { read: true },
 * });
 * ```
 * @public
 */
export declare const CapabilitiesProvider: ServiceIdentifier<ICapabilitiesProvider>;
