import type { SavedObjectsDeleteByNamespaceOptions } from '@kbn/core-saved-objects-api-server';
import type { ApiExecutionContext } from './types';
export interface PerformDeleteByNamespaceParams<T = unknown> {
    namespace: string;
    options: SavedObjectsDeleteByNamespaceOptions;
}
export declare const performDeleteByNamespace: <T>({ namespace, options }: PerformDeleteByNamespaceParams<T>, { registry, helpers, client, mappings, extensions }: ApiExecutionContext) => Promise<any>;
