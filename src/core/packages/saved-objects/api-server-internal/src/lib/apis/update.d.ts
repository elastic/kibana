import type { SavedObjectsUpdateOptions, SavedObjectsUpdateResponse } from '@kbn/core-saved-objects-api-server';
import type { ApiExecutionContext } from './types';
export interface PerformUpdateParams<T = unknown> {
    type: string;
    id: string;
    attributes: T;
    options: SavedObjectsUpdateOptions<T>;
}
export declare const performUpdate: <T>(updateParams: PerformUpdateParams<T>, apiContext: ApiExecutionContext) => Promise<SavedObjectsUpdateResponse<T>>;
export declare const executeUpdate: <T>({ id, type, attributes, options }: PerformUpdateParams<T>, { registry, helpers, client, serializer, extensions, logger }: ApiExecutionContext, { namespace }: {
    namespace: string | undefined;
}) => Promise<SavedObjectsUpdateResponse<T>>;
