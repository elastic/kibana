/**
 * Management Plugin - public
 *
 * This is the entry point for the entire client-side public contract of the plugin.
 * If something is not explicitly exported here, you can safely assume it is private
 * to the plugin and not considered stable.
 *
 * All stateful contracts will be injected by the platform at runtime, and are defined
 * in the setup/start interfaces in `plugin.ts`. The remaining items exported here are
 * either types, or static code.
 */
import { DataViewEditorPlugin } from './plugin';
export type { PluginStart as DataViewEditorStart, DataViewEditorProps, DataViewEditorService, } from './types';
export declare function plugin(): DataViewEditorPlugin;
