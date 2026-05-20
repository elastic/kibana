import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { ESQLExtensionsRegistry } from './extensions_registry';
export interface EsqlServerPluginSetup {
    getExtensionsRegistry: () => ESQLExtensionsRegistry;
}
export interface EsqlServerPluginStart {
    inference: InferenceServerStart;
    actions: ActionsPluginStart;
}
