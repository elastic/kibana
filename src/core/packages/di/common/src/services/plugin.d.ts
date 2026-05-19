import type { Container, ServiceIdentifier } from 'inversify';
/**
 * Plugin's setup contract.
 * @public
 */
export declare const Setup: ServiceIdentifier;
/**
 * Plugin's start contract.
 * @public
 */
export declare const Start: ServiceIdentifier;
/**
 * Plugin's setup lifecycle hook.
 * @public
 */
export declare const OnSetup: ServiceIdentifier<(container: Container) => void>;
/**
 * Plugin's start lifecycle hook.
 * @public
 */
export declare const OnStart: ServiceIdentifier<(container: Container) => void>;
/**
 * Plugin's setup dependency.
 * @param plugin The dependency plugin name.
 * @public
 */
export declare function PluginSetup<T>(plugin: keyof any): ServiceIdentifier<T>;
/**
 * Plugin's start dependency.
 * @param plugin The dependency plugin name.
 * @public
 */
export declare function PluginStart<T>(plugin: keyof any): ServiceIdentifier<T>;
