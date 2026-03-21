import type { HttpStart } from '@kbn/core/public';
import type { v1 } from '../../common';
export declare function findObjects(http: HttpStart, findOptions: v1.FindQueryHTTP): Promise<v1.FindResponseHTTP>;
