import type { HttpStart } from '@kbn/core/public';
import type { v1 } from '../../common';
export declare function getSavedObjectCounts({ http, searchString, typesToInclude, references, }: {
    http: HttpStart;
} & v1.ScrollCountBodyHTTP): Promise<v1.ScrollCountResponseHTTP>;
