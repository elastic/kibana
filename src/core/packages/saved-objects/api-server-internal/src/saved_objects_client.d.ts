import { type SavedObject, SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { SavedObjectsClientContract, ISavedObjectsRepository, SavedObjectsBaseOptions, SavedObjectsBulkResponse, SavedObjectsUpdateResponse, SavedObjectsBulkGetObject, SavedObjectsBulkResolveObject, SavedObjectsBulkCreateObject, SavedObjectsBulkResolveResponse, SavedObjectsCreateOptions, SavedObjectsFindResponse, SavedObjectsBulkUpdateResponse, SavedObjectsUpdateObjectsSpacesOptions, SavedObjectsCollectMultiNamespaceReferencesOptions, SavedObjectsCollectMultiNamespaceReferencesResponse, SavedObjectsCheckConflictsObject, SavedObjectsCheckConflictsResponse, SavedObjectsBulkUpdateOptions, SavedObjectsRemoveReferencesToOptions, SavedObjectsDeleteOptions, SavedObjectsBulkUpdateObject, ISavedObjectsPointInTimeFinder, SavedObjectsCreatePointInTimeFinderDependencies, SavedObjectsResolveOptions, SavedObjectsResolveResponse, SavedObjectsCollectMultiNamespaceReferencesObject, SavedObjectsUpdateObjectsSpacesObject, SavedObjectsUpdateOptions, SavedObjectsOpenPointInTimeOptions, SavedObjectsClosePointInTimeOptions, SavedObjectsCreatePointInTimeFinderOptions, SavedObjectsFindOptions, SavedObjectsGetOptions, SavedObjectsBulkDeleteObject, SavedObjectsBulkDeleteOptions, SavedObjectsBulkDeleteResponse, SavedObjectsChangeAccessControlResponse, SavedObjectsChangeAccessControlObject, SavedObjectsChangeAccessModeOptions, SavedObjectsChangeOwnershipOptions, SavedObjectsRawDocSource, SavedObjectsSearchOptions, SavedObjectsSearchResponse, SavedObjectsEsqlOptions, SavedObjectsEsqlResponse } from '@kbn/core-saved-objects-api-server';
/**
 * Core internal implementation of {@link SavedObjectsClientContract}
 * @internal
 */
export declare class SavedObjectsClient implements SavedObjectsClientContract {
    static errors: typeof SavedObjectsErrorHelpers;
    errors: typeof SavedObjectsErrorHelpers;
    private _repository;
    /** @internal */
    constructor(repository: ISavedObjectsRepository);
    /** {@inheritDoc SavedObjectsClientContract.create} */
    create<T = unknown>(type: string, attributes: T, options?: SavedObjectsCreateOptions): Promise<import("@kbn/core/types").SavedObject<T>>;
    /** {@inheritDoc SavedObjectsClientContract.bulkCreate} */
    bulkCreate<T = unknown>(objects: Array<SavedObjectsBulkCreateObject<T>>, options?: SavedObjectsCreateOptions): Promise<SavedObjectsBulkResponse<T>>;
    /** {@inheritDoc SavedObjectsClientContract.checkConflicts} */
    checkConflicts(objects?: SavedObjectsCheckConflictsObject[], options?: SavedObjectsBaseOptions): Promise<SavedObjectsCheckConflictsResponse>;
    /** {@inheritDoc SavedObjectsClientContract.delete} */
    delete(type: string, id: string, options?: SavedObjectsDeleteOptions): Promise<{}>;
    /** {@inheritDoc SavedObjectsClientContract.bulkDelete} */
    bulkDelete(objects: SavedObjectsBulkDeleteObject[], options?: SavedObjectsBulkDeleteOptions): Promise<SavedObjectsBulkDeleteResponse>;
    /** {@inheritDoc SavedObjectsClientContract.find} */
    find<T = unknown, A = unknown>(options: SavedObjectsFindOptions): Promise<SavedObjectsFindResponse<T, A>>;
    /** {@inheritDoc SavedObjectsClientContract.search} */
    search<T extends SavedObjectsRawDocSource = SavedObjectsRawDocSource, A = unknown>(options: SavedObjectsSearchOptions): Promise<SavedObjectsSearchResponse<T, A>>;
    /** {@inheritDoc SavedObjectsClientContract.esql} */
    esql(options: SavedObjectsEsqlOptions): Promise<SavedObjectsEsqlResponse>;
    /** {@inheritDoc SavedObjectsClientContract.bulkGet} */
    bulkGet<T = unknown>(objects?: SavedObjectsBulkGetObject[], options?: SavedObjectsGetOptions): Promise<SavedObjectsBulkResponse<T>>;
    /** {@inheritDoc SavedObjectsClientContract.get} */
    get<T = unknown>(type: string, id: string, options?: SavedObjectsGetOptions): Promise<SavedObject<T>>;
    /** {@inheritDoc SavedObjectsClientContract.bulkResolve} */
    bulkResolve<T = unknown>(objects: SavedObjectsBulkResolveObject[], options?: SavedObjectsResolveOptions): Promise<SavedObjectsBulkResolveResponse<T>>;
    /** {@inheritDoc SavedObjectsClientContract.resolve} */
    resolve<T = unknown>(type: string, id: string, options?: SavedObjectsResolveOptions): Promise<SavedObjectsResolveResponse<T>>;
    /** {@inheritDoc SavedObjectsClientContract.update} */
    update<T = unknown>(type: string, id: string, attributes: Partial<T>, options?: SavedObjectsUpdateOptions<T>): Promise<SavedObjectsUpdateResponse<T>>;
    /** {@inheritDoc SavedObjectsClientContract.bulkUpdate} */
    bulkUpdate<T = unknown>(objects: Array<SavedObjectsBulkUpdateObject<T>>, options?: SavedObjectsBulkUpdateOptions): Promise<SavedObjectsBulkUpdateResponse<T>>;
    /** {@inheritDoc SavedObjectsClientContract.removeReferencesTo} */
    removeReferencesTo(type: string, id: string, options?: SavedObjectsRemoveReferencesToOptions): Promise<import("@kbn/core-saved-objects-api-server").SavedObjectsRemoveReferencesToResponse>;
    /** {@inheritDoc SavedObjectsClientContract.openPointInTimeForType} */
    openPointInTimeForType(type: string | string[], options?: SavedObjectsOpenPointInTimeOptions): Promise<import("@kbn/core-saved-objects-api-server").SavedObjectsOpenPointInTimeResponse>;
    /** {@inheritDoc SavedObjectsClientContract.closePointInTime} */
    closePointInTime(id: string, options?: SavedObjectsClosePointInTimeOptions): Promise<import("@kbn/core-saved-objects-api-server").SavedObjectsClosePointInTimeResponse>;
    /** {@inheritDoc SavedObjectsClientContract.createPointInTimeFinder} */
    createPointInTimeFinder<T = unknown, A = unknown>(findOptions: SavedObjectsCreatePointInTimeFinderOptions, dependencies?: SavedObjectsCreatePointInTimeFinderDependencies): ISavedObjectsPointInTimeFinder<T, A>;
    /** {@inheritDoc SavedObjectsClientContract.collectMultiNamespaceReferences} */
    collectMultiNamespaceReferences(objects: SavedObjectsCollectMultiNamespaceReferencesObject[], options?: SavedObjectsCollectMultiNamespaceReferencesOptions): Promise<SavedObjectsCollectMultiNamespaceReferencesResponse>;
    /** {@inheritDoc SavedObjectsClientContract.updateObjectsSpaces} */
    updateObjectsSpaces(objects: SavedObjectsUpdateObjectsSpacesObject[], spacesToAdd: string[], spacesToRemove: string[], options?: SavedObjectsUpdateObjectsSpacesOptions): Promise<import("@kbn/core-saved-objects-api-server").SavedObjectsUpdateObjectsSpacesResponse>;
    /** {@inheritDoc SavedObjectsClientContract.getCurrentNamespace} */
    getCurrentNamespace(): string | undefined;
    /** {@inheritDoc SavedObjectsClientContract.asScopedToNamespace} */
    asScopedToNamespace(namespace: string): SavedObjectsClient;
    /** {@inheritDoc SavedObjectsClientContract.changeOwnership} */
    changeOwnership(objects: SavedObjectsChangeAccessControlObject[], options: SavedObjectsChangeOwnershipOptions): Promise<SavedObjectsChangeAccessControlResponse>;
    /** {@inheritDoc SavedObjectsClientContract.changeAccessMode} */
    changeAccessMode(objects: SavedObjectsChangeAccessControlObject[], options: SavedObjectsChangeAccessModeOptions): Promise<SavedObjectsChangeAccessControlResponse>;
}
