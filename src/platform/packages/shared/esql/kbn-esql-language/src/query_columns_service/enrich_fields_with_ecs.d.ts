import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
export interface ECSMetadata {
    [key: string]: {
        type?: string;
        source?: string;
        description?: string;
    };
}
/**
 * Returns columns with the metadata/description (e.g ECS info)
 * if available
 *
 * @param columns
 * @param fieldsMetadata
 * @returns
 */
export declare function enrichFieldsWithECSInfo(columns: Array<Omit<ESQLFieldWithMetadata, 'metadata'>>, ecsMetadataCache?: ECSMetadata): ESQLFieldWithMetadata[];
