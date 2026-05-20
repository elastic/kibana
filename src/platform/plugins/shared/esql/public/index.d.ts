import type { PluginInitializerContext } from '@kbn/core/public';
import type { EsqlPlugin} from './plugin';
import { type EsqlPluginSetup, type EsqlPluginStart } from './plugin';
export { ESQLLangEditor } from './create_editor';
export { ESQLMenu, EsqlEditorActionsProvider } from './lazy_esql_menu';
export { useESQLQueryStats } from './hooks/use_esql_query_stats';
export type { ESQLEditorProps, DataErrorsControl } from '@kbn/esql-editor';
export type { EsqlPluginSetup, EsqlPluginStart };
export declare function plugin(initContext: PluginInitializerContext): EsqlPlugin;
