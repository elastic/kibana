import type { SavedObject } from '@kbn/core/server';
import type { AsCodeMeta } from './schema';
export declare function getMeta(savedObject: Pick<SavedObject, 'created_at' | 'created_by' | 'managed' | 'accessControl' | 'updated_at' | 'updated_by' | 'version'>): AsCodeMeta;
