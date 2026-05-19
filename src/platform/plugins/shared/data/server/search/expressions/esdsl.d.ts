import type { StartServicesAccessor } from '@kbn/core/server';
import type { DataPluginStart, DataPluginStartDependencies } from '../../plugin';
/**
 * This is some glue code that takes in `core.getStartServices`, extracts the dependencies
 * needed for this function, and wraps them behind a `getStartDependencies` function that
 * is then called at runtime.
 *
 * We do this so that we can be explicit about exactly which dependencies the function
 * requires, without cluttering up the top-level `plugin.ts` with this logic. It also
 * makes testing the expression function a bit easier since `getStartDependencies` is
 * the only thing you should need to mock.
 *
 * @param getStartServices - core's StartServicesAccessor for this plugin
 *
 * @internal
 */
export declare function getEsdsl({ getStartServices, }: {
    getStartServices: StartServicesAccessor<DataPluginStartDependencies, DataPluginStart>;
}): import("../../../common/search/expressions/esdsl").EsdslExpressionFunctionDefinition;
