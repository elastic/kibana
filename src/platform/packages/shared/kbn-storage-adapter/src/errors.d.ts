import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';
export declare class BulkOperationError extends Error {
    response: BulkResponse;
    constructor(message: string, response: BulkResponse);
}
