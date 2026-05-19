import type { TypeOf } from '@kbn/config-schema';
import { type Type } from '@kbn/config-schema';
import type { Env } from '@kbn/config';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
import { type KibanaGroup } from '@kbn/projects-solutions-groups';
declare const configSchema: import("@kbn/config-schema").ObjectType<{
    initialize: Type<boolean>;
    /**
     * Defines an array of directories where another plugin should be loaded from.
     */
    paths: Type<string[]>;
    /**
     * Defines an array of groups to include when loading plugins.
     * Plugins from all groups will be taken into account if the parameter is not provided.
     */
    allowlistPluginGroups: Type<("security" | "workplaceai" | "vectordb" | "search" | "observability" | "platform")[] | undefined>;
    /**
     * Internal config, not intended to be used by end users. Only for specific
     * internal purposes.
     */
    forceEnableAllPlugins: Type<boolean | undefined>;
}>;
type InternalPluginsConfigType = TypeOf<typeof configSchema>;
export type PluginsConfigType = Omit<InternalPluginsConfigType, '__internal__'>;
export declare const config: ServiceConfigDescriptor<PluginsConfigType>;
/** @internal */
export declare class PluginsConfig {
    /**
     * Indicates whether or not plugins should be initialized.
     */
    readonly initialize: boolean;
    /**
     * Defines directories that we should scan for the plugin subdirectories.
     */
    readonly pluginSearchPaths: readonly string[];
    /**
     * Defines directories where an additional plugin exists.
     */
    readonly additionalPluginPaths: readonly string[];
    /**
     * Whether to enable all plugins.
     *
     * @note this is intended to be an undocumented setting.
     */
    readonly shouldEnableAllPlugins: boolean;
    /**
     * Specify an allowlist of plugin groups.
     * Allows reducing the amount of plugins that are taken into account.
     * The list will default to "all plugin groups" if the config is not present.
     */
    readonly allowlistPluginGroups?: readonly KibanaGroup[];
    constructor(rawConfig: PluginsConfigType, env: Env);
}
export {};
