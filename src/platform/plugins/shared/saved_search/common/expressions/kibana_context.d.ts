import type { ExecutionContext } from '@kbn/expressions-plugin/common';
import type { ExpressionFunctionKibanaContext } from '@kbn/data-plugin/common';
import type { SavedSearch } from '../types';
export interface KibanaContextStartDependencies {
    getSavedSearch: (id: string) => Promise<SavedSearch>;
}
export declare const getKibanaContextFn: (getStartDependencies: (getKibanaRequest: ExecutionContext["getKibanaRequest"]) => Promise<KibanaContextStartDependencies>) => ExpressionFunctionKibanaContext;
