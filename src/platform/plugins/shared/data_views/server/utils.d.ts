import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { DataViewAttributes, SavedObject, FieldSpec } from '../common';
import type { QueryDslQueryContainer } from '../common/types';
/**
 * @deprecated Use data views api instead
 */
export declare const getFieldByName: (fieldName: string, indexPattern: SavedObject<DataViewAttributes>) => FieldSpec | undefined;
/**
 * @deprecated Use data views api instead
 */
export declare const findIndexPatternById: (savedObjectsClient: SavedObjectsClientContract, index: string) => Promise<SavedObject<DataViewAttributes> | undefined>;
interface GetIndexFilterDslOptions {
    indexFilter?: QueryDslQueryContainer;
    excludedTiers?: string;
}
export declare const getIndexFilterDsl: ({ indexFilter, excludedTiers, }: GetIndexFilterDslOptions) => QueryDslQueryContainer | undefined;
export {};
