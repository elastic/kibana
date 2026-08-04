import type { HttpStart } from '@kbn/core/public';
import type { v1 } from '../../common';
export declare function getRelationships(http: HttpStart, type: string, id: string, savedObjectTypes: string[], size?: number): Promise<v1.RelationshipsResponseHTTP>;
