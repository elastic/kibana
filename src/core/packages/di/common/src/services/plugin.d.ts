import type { Container } from 'inversify';
import type { ServiceToken } from '../token';
/**
 * Plugin's setup contract.
 * @public
 */
export declare const Setup: ServiceToken<unknown>;
/**
 * Plugin's start contract.
 * @public
 */
export declare const Start: ServiceToken<unknown>;
/**
 * Plugin's setup lifecycle hook.
 * @public
 */
export declare const OnSetup: ServiceToken<(container: Container) => void>;
/**
 * Plugin's start lifecycle hook.
 * @public
 */
export declare const OnStart: ServiceToken<(container: Container) => void>;
/**
 * Plugin's setup dependency.
 * @param plugin The dependency plugin name.
 * @public
 */
export declare function PluginSetup<T>(plugin: keyof any): ServiceToken<T>;
/**
 * Plugin's start dependency.
 * @param plugin The dependency plugin name.
 * @public
 */
export declare function PluginStart<T>(plugin: keyof any): ServiceToken<T>;
