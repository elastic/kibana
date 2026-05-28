import type { SearchQuery, SearchIn } from '@kbn/content-management-plugin/common';
import type { ContentStorage, StorageContext, MSearchConfig } from '@kbn/content-management-plugin/server';
import type { SavedObject, SavedObjectReference, SavedObjectsFindOptions, SavedObjectsCreateOptions, SavedObjectsUpdateOptions, SavedObjectsFindResult } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';
import type { CMCrudTypes, ServicesDefinitionSet } from './types';
export type PartialSavedObject<T> = Omit<SavedObject<Partial<T>>, 'references'> & {
    references: SavedObjectReference[] | undefined;
};
export interface SearchArgsToSOFindOptionsOptionsDefault {
    fields?: string[];
    searchFields?: string[];
}
export declare const searchArgsToSOFindOptionsDefault: <T extends string>(params: SearchIn<T, SearchArgsToSOFindOptionsOptionsDefault>) => SavedObjectsFindOptions;
export declare const createArgsToSoCreateOptionsDefault: (params: SavedObjectsCreateOptions) => SavedObjectsCreateOptions;
export declare const updateArgsToSoUpdateOptionsDefault: <Types extends CMCrudTypes>(params: SavedObjectsUpdateOptions<Types["Attributes"]>) => SavedObjectsUpdateOptions<Types["Attributes"]>;
export type CreateArgsToSoCreateOptions<Types extends CMCrudTypes> = (params: Types['CreateOptions']) => SavedObjectsCreateOptions;
export type SearchArgsToSOFindOptions<Types extends CMCrudTypes> = (params: Types['SearchIn']) => SavedObjectsFindOptions;
export type UpdateArgsToSoUpdateOptions<Types extends CMCrudTypes> = (params: Types['UpdateOptions']) => SavedObjectsUpdateOptions<Types['Attributes']>;
export interface SOContentStorageConstructorParams<Types extends CMCrudTypes> {
    savedObjectType: string;
    cmServicesDefinition: ServicesDefinitionSet;
    allowedSavedObjectAttributes: Array<keyof Types['Attributes']>;
    createArgsToSoCreateOptions?: CreateArgsToSoCreateOptions<Types>;
    updateArgsToSoUpdateOptions?: UpdateArgsToSoUpdateOptions<Types>;
    searchArgsToSOFindOptions?: SearchArgsToSOFindOptions<Types>;
    /**
     * MSearch is a feature that allows searching across multiple content types
     * (for example, could be used in a general content finder or the like)
     *
     * defaults to false
     */
    enableMSearch?: boolean;
    mSearchAdditionalSearchFields?: string[];
    logger: Logger;
    throwOnResultValidationError: boolean;
}
export declare abstract class SOContentStorage<Types extends CMCrudTypes> implements ContentStorage<Types['Item'], Types['PartialItem'], MSearchConfig<Types['Item'], Types['Attributes']>> {
    constructor({ savedObjectType, cmServicesDefinition, createArgsToSoCreateOptions, updateArgsToSoUpdateOptions, searchArgsToSOFindOptions, enableMSearch, allowedSavedObjectAttributes, mSearchAdditionalSearchFields, logger, throwOnResultValidationError, }: SOContentStorageConstructorParams<Types>);
    protected static getSOClientFromRequest: (ctx: StorageContext) => Promise<import("@kbn/core-saved-objects-api-server").SavedObjectsClientContract>;
    protected readonly throwOnResultValidationError: boolean;
    protected readonly logger: Logger;
    protected readonly savedObjectType: SOContentStorageConstructorParams<Types>['savedObjectType'];
    protected readonly cmServicesDefinition: SOContentStorageConstructorParams<Types>['cmServicesDefinition'];
    protected readonly createArgsToSoCreateOptions: CreateArgsToSoCreateOptions<Types>;
    protected readonly updateArgsToSoUpdateOptions: UpdateArgsToSoUpdateOptions<Types>;
    protected readonly searchArgsToSOFindOptions: SearchArgsToSOFindOptions<Types>;
    protected readonly allowedSavedObjectAttributes: Array<keyof Types['Attributes']>;
    protected savedObjectToItem(savedObject: SavedObject<Types['Attributes']>): Types['Item'];
    protected savedObjectToItem(savedObject: PartialSavedObject<Types['Attributes']>, partial: true): Types['PartialItem'];
    mSearch?: {
        savedObjectType: string;
        toItemResult: (ctx: StorageContext, savedObject: SavedObjectsFindResult) => Types['Item'];
        additionalSearchFields?: string[];
    };
    get(ctx: StorageContext, id: string): Promise<Types['GetOut']>;
    bulkGet(): Promise<never>;
    create(ctx: StorageContext, data: Types['Attributes'], options: Types['CreateOptions']): Promise<Types['CreateOut']>;
    update(ctx: StorageContext, id: string, data: Types['Attributes'], options: Types['UpdateOptions']): Promise<Types['UpdateOut']>;
    delete(ctx: StorageContext, id: string, options?: {
        force: boolean;
    }): Promise<Types['DeleteOut']>;
    search(ctx: StorageContext, query: SearchQuery, options?: Types['SearchOptions']): Promise<Types['SearchOut']>;
}
