import type { PluginInitializerContext } from '@kbn/core/public';
import { EsqlPlugin, type EsqlPluginStart } from './plugin';
export { ESQLLangEditor } from './create_editor';
export { ESQLMenu, EsqlEditorActionsProvider } from './lazy_esql_menu';
export { useESQLQueryStats } from './hooks/use_esql_query_stats';
export type { ESQLEditorProps, DataErrorsControl } from '@kbn/esql-editor';
export type { EsqlPluginStart };
export declare function plugin(initContext: PluginInitializerContext): EsqlPlugin;
