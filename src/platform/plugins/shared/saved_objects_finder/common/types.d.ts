import type { SOWithMetadata } from '@kbn/content-management-utils';
export type SavedObjectCommon<T extends FinderAttributes = FinderAttributes> = SOWithMetadata<T>;
export interface FinderAttributes {
    title?: string;
    name?: string;
    description?: string;
}
