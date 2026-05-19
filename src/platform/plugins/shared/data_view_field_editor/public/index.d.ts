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
import { IndexPatternFieldEditorPlugin } from './plugin';
export type { Field, PluginSetup as IndexPatternFieldEditorSetup, PluginStart as IndexPatternFieldEditorStart, } from './types';
export type { PluginSetup as DataViewFieldEditorSetup, PluginStart as DataViewFieldEditorStart, } from './types';
export { DefaultFormatEditor } from './components/field_format_editor/editors/default/default';
export type { FieldFormatEditorFactory, FieldFormatEditor, DeleteFieldProviderProps, FormatEditorProps, FormatEditorState, Sample, } from './components';
export declare function plugin(): IndexPatternFieldEditorPlugin;
export type { FormatEditorServiceStart } from './service';
export type { OpenFieldEditorOptions } from './open_editor';
export type { OpenFieldDeleteModalOptions, DeleteCompositeSubfield } from './open_delete_modal';
