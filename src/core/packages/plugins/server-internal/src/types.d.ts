import type { PluginName, PluginOpaqueId } from '@kbn/core-base-common';
/** @internal */
export interface PluginDependencies {
    /**
     * Plugin to dependencies map with plugin names as key/values.
     *
     * Keys sorted by plugin topological order (root plugins first, leaf plugins last).
     */
    asNames: ReadonlyMap<PluginName, PluginName[]>;
    /**
     * Plugin to dependencies map with plugin opaque ids as key/values.
     *
     * Keys sorted by plugin topological order (root plugins first, leaf plugins last).
     */
    asOpaqueIds: ReadonlyMap<PluginOpaqueId, PluginOpaqueId[]>;
}
