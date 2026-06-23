/**
 * The base group, for all modules that are commonly used across solutions.
 */
export declare const KIBANA_PLATFORM: "platform";
/**
 * A list of all Kibana groups (platform + solutions).
 */
export declare const KIBANA_GROUPS: readonly ["platform", "observability", "security", "search", "workplaceai", "vectordb"];
/**
 * A type that defines the existing groups (platform + solutions).
 */
export type KibanaGroup = (typeof KIBANA_GROUPS)[number];
/**
 * The groups to which a module can belong.
 * 'common' is the default for uncategorised modules.
 */
export type ModuleGroup = KibanaGroup | 'common';
/**
 * ModuleVisibility tells whether a module is accessible from any module (shared) or only from modules of the same group (private)
 */
export type ModuleVisibility = 'private' | 'shared';
