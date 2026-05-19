import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { ContentManagementServerSetup } from '@kbn/content-management-plugin/server';
import { ESQLExtensionsRegistry } from './extensions_registry';
import type { EsqlServerPluginSetup, EsqlServerPluginStart } from './types';
export declare class EsqlServerPlugin implements Plugin<EsqlServerPluginSetup, void, {
    contentManagement: ContentManagementServerSetup;
}, EsqlServerPluginStart> {
    private readonly initContext;
    private extensionsRegistry;
    constructor(initContext: PluginInitializerContext);
    setup(core: CoreSetup<EsqlServerPluginStart, void>, plugins: {
        contentManagement: ContentManagementServerSetup;
    }): {
        getExtensionsRegistry: () => ESQLExtensionsRegistry;
    };
    start(core: CoreStart): {};
    stop(): void;
}
