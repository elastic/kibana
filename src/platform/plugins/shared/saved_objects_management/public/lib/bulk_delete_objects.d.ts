import type { HttpStart } from '@kbn/core/public';
import type { v1 } from '../../common';
export declare function bulkDeleteObjects(http: HttpStart, objects: v1.BulkDeleteBodyHTTP): Promise<v1.BulkDeleteResponseHTTP>;
