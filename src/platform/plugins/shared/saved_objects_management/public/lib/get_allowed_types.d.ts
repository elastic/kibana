import type { HttpStart } from '@kbn/core/public';
import type { v1 } from '../../common';
export declare function getAllowedTypes(http: HttpStart): Promise<v1.GetAllowedTypesResponseHTTP['types']>;
