import type { HttpStart } from '@kbn/core/public';
import type { v1 } from '../../common';
export declare function bulkGetObjects(http: HttpStart, objects: v1.BulkGetBodyHTTP): Promise<v1.BulkGetResponseHTTP>;
