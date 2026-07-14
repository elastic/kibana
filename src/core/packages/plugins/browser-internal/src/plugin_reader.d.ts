import type { ContainerModule } from 'inversify';
import type { PluginInitializer } from '@kbn/core-plugins-browser';
/**
 * Unknown variant for internal use only for when plugins are not known.
 * @internal
 */
export type UnknownPluginInitializer = PluginInitializer<unknown, unknown>;
/**
 * @internal
 */
export interface PluginDefinition {
    module?: ContainerModule;
    plugin?: UnknownPluginInitializer;
}
/**
 * Custom window type for loading bundles. Do not extend global Window to avoid leaking these types.
 * @internal
 */
export interface CoreWindow {
    __kbnBundles__: {
        has(key: string): boolean;
        get(key: string): PluginDefinition | undefined;
    };
}
/**
 * Reads the plugin's bundle declared in the global context via __kbnBundles__.
 */
export declare function read(name: string): PluginDefinition;
