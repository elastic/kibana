import type { GetIn, CreateIn, SearchIn, UpdateIn, DeleteIn, DeleteResult, SearchResult, GetResult, CreateResult, UpdateResult } from '@kbn/content-management-plugin/common';
import type { ContentManagementCrudTypes, Reference } from '@kbn/content-management-utils';
import type { VisualizationContentType } from '../types';
export type VisualizationSavedObjectAttributes = {
    title: string;
    description?: string;
    kibanaSavedObjectMeta?: {
        searchSourceJSON?: string;
    };
    version?: string;
    visState?: string;
    uiStateJSON?: string;
    savedSearchRefName?: string;
    typeName?: string;
};
export interface VisualizationSavedObject {
    id: string;
    type: string;
    version?: string;
    updatedAt?: string;
    createdAt?: string;
    attributes: VisualizationSavedObjectAttributes;
    references: Reference[];
    namespaces?: string[];
    originId?: string;
    error?: {
        error: string;
        message: string;
        statusCode: number;
        metadata?: Record<string, unknown>;
    };
    managed?: boolean;
}
export type PartialVisualizationSavedObject = Omit<VisualizationSavedObject, 'attributes' | 'references'> & {
    attributes: Partial<VisualizationSavedObjectAttributes>;
    references: Reference[] | undefined;
};
export type VisualizationGetIn = GetIn<VisualizationContentType>;
export type VisualizationGetOut = GetResult<VisualizationSavedObject, {
    outcome: 'exactMatch' | 'aliasMatch' | 'conflict';
    aliasTargetId?: string;
    aliasPurpose?: 'savedObjectConversion' | 'savedObjectImport';
}>;
export interface CreateOptions {
    /** If a document with the given `id` already exists, overwrite it's contents (default=false). */
    overwrite?: boolean;
    /** Array of referenced saved objects. */
    references?: Reference[];
}
export type VisualizationCreateIn = CreateIn<VisualizationContentType, VisualizationSavedObjectAttributes, CreateOptions>;
export type VisualizationCreateOut = CreateResult<VisualizationSavedObject>;
export interface UpdateOptions {
    /** Array of referenced saved objects. */
    references?: Reference[];
    overwrite?: boolean;
}
export type VisualizationUpdateIn = UpdateIn<VisualizationContentType, VisualizationSavedObjectAttributes, UpdateOptions>;
export type VisualizationUpdateOut = UpdateResult<PartialVisualizationSavedObject>;
export type VisualizationDeleteIn = DeleteIn<VisualizationContentType>;
export type VisualizationDeleteOut = DeleteResult;
export interface VisualizationSearchQuery {
    types?: string[];
    searchFields?: string[];
}
export type VisualizationSearchIn = SearchIn<VisualizationContentType, {}>;
export type VisualizationSearchOut = SearchResult<VisualizationSavedObject>;
export type VisualizationCrudTypes = ContentManagementCrudTypes<VisualizationContentType, VisualizationSavedObjectAttributes, CreateOptions, UpdateOptions, {}>;
