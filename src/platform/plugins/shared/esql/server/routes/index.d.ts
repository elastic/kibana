import type { CoreSetup, PluginInitializerContext } from '@kbn/core/server';
import type { EsqlServerPluginStart } from '../types';
import type { ESQLExtensionsRegistry } from '../extensions_registry';
export declare const registerRoutes: (setup: CoreSetup<EsqlServerPluginStart>, extensionsRegistry: ESQLExtensionsRegistry, initContext: PluginInitializerContext) => void;
