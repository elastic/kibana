import type { CoreSetup } from '@kbn/core/server';
import type { DiscoverSessionApiResponse } from './schema';
type DiscoverSessionOperation = 'create' | 'update' | 'delete';
type DiscoverSessionActivityResult = Pick<DiscoverSessionApiResponse, 'id'> & {
    data: Pick<DiscoverSessionApiResponse['data'], 'title'>;
};
export declare const trackDiscoverSessionAction: (userActivity: CoreSetup["userActivity"], operation: DiscoverSessionOperation, result: DiscoverSessionActivityResult) => void;
export {};
