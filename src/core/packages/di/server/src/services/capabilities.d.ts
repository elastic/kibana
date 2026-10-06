import type { Capabilities } from '@kbn/core-capabilities-common';
import type { CapabilitiesProvider as ICapabilitiesProvider, CapabilitiesSwitcher as CapabilitiesSwitcherFunction, CapabilitiesSwitcherOptions, ResolveCapabilitiesOptions } from '@kbn/core-capabilities-server';
import type { ServiceToken } from '@kbn/core-di';
/**
 * Service identifier to register a capabilities provider.
 * @see {@link CapabilitiesSetup}
 * @example
 * ```ts
 * bind(CapabilitiesProvider).toConstantValue(() => ({
 *   something: { read: true },
 * }));
 * ```
 * @public
 */
export declare const CapabilitiesProvider: ServiceToken<ICapabilitiesProvider>;
/**
 * A capabilities switcher together with its registration options.
 * @see {@link CapabilitiesSetup.registerSwitcher}
 * @public
 */
export interface ICapabilitiesSwitcher extends CapabilitiesSwitcherOptions {
    /**
     * The switcher function changing the default state of the capabilities entries.
     */
    switch: CapabilitiesSwitcherFunction;
}
/**
 * Service identifier to register a capabilities switcher.
 * @see {@link ICapabilitiesSwitcher}
 * @example
 * ```ts
 * bind(CapabilitiesSwitcher).toConstantValue({
 *   capabilityPath: 'myPlugin.*',
 *   switch: (request, capabilities) => ({
 *     myPlugin: { read: false },
 *   }),
 * });
 * ```
 * @public
 */
export declare const CapabilitiesSwitcher: ServiceToken<ICapabilitiesSwitcher>;
/**
 * Resolves the {@link Capabilities} for the current HTTP request.
 * @public
 */
export type ICapabilitiesResolver = (options: ResolveCapabilitiesOptions) => Promise<Capabilities>;
/**
 * The resolver of the capabilities in the current HTTP request context.
 * @see {@link ICapabilitiesResolver}
 * @public
 */
export declare const CapabilitiesResolver: ServiceToken<ICapabilitiesResolver>;
