import type { BulkOperationContainer } from '@elastic/elasticsearch/lib/api/types';
import type { BulkOperation } from '../model/create_batches';
export declare const redactBulkOperationBatches: (bulkOperationBatches: BulkOperation[][]) => BulkOperationContainer[][];
