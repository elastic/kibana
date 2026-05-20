import type { IRouter, PluginInitializerContext } from '@kbn/core/server';
import type { ESQLExtensionsRegistry } from '../extensions_registry';
/**
 * Registers the ESQL extensions route.
 * This route handles requests for ESQL extensions based on the provided solutionId and query.
 *
 * @param router The IRouter instance to register the route with.
 * @param extensionsRegistry The ESQLExtensionsRegistry instance to use for fetching recommended queries.
 * @param logger The logger instance from the PluginInitializerContext.
 */
export declare const registerESQLExtensionsRoute: (router: IRouter, extensionsRegistry: ESQLExtensionsRegistry, { logger }: PluginInitializerContext) => void;
