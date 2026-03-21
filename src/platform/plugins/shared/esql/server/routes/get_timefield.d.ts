import type { IRouter, PluginInitializerContext } from '@kbn/core/server';
/**
 * Registers the ESQL get timefield route.
 * This route returns the timefield to use for the ES|QL ad-hoc dataview.
 *
 * The timefield is extracted from the ES|QL query if specified.
 * If not specified, it checks if the index pattern contains the default time field '@timestamp'.
 * In case of subqueries, it verifies that all involved indices contain the '@timestamp' field.
 * @param router The IRouter instance to register the route with.
 * @param logger The logger instance from the PluginInitializerContext.
 *
 * @returns timeField or undefined
 */
export declare const registerGetTimeFieldRoute: (router: IRouter, { logger }: PluginInitializerContext) => void;
