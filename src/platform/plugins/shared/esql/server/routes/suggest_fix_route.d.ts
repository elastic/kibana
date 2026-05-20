import type { CoreSetup, IRouter, PluginInitializerContext } from '@kbn/core/server';
import type { EsqlServerPluginStart } from '../types';
export declare const registerSuggestFixRoute: (router: IRouter, getStartServices: CoreSetup<EsqlServerPluginStart>["getStartServices"], context: PluginInitializerContext) => void;
