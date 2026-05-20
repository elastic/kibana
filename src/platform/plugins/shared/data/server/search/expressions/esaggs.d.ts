import type { KibanaRequest, StartServicesAccessor } from '@kbn/core/server';
import type { EsaggsExpressionFunctionDefinition, EsaggsStartDependencies } from '../../../common/search/expressions';
import type { DataPluginStartDependencies, DataPluginStart } from '../../plugin';
/**
 * Returns the expression function definition. Any stateful dependencies are accessed
 * at runtime via the `getStartDependencies` param, which provides the specific services
 * needed for this function to run.
 *
 * This function is an implementation detail of this module, and is exported separately
 * only for testing purposes.
 *
 * @param getStartDependencies - async function that resolves with EsaggsStartDependencies
 *
 * @internal
 */
export declare function getFunctionDefinition({ getStartDependencies, }: {
    getStartDependencies: (req: KibanaRequest) => Promise<EsaggsStartDependencies>;
}): () => EsaggsExpressionFunctionDefinition;
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
export declare function getEsaggs({ getStartServices, }: {
    getStartServices: StartServicesAccessor<DataPluginStartDependencies, DataPluginStart>;
}): () => EsaggsExpressionFunctionDefinition;
