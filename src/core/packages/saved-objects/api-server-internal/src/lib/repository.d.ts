import type { Logger } from '@kbn/logging';
import type { RequestTiming } from '@kbn/core-http-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsBaseOptions, SavedObjectsIncrementCounterOptions, SavedObjectsDeleteByNamespaceOptions, SavedObjectsBulkResponse, SavedObjectsUpdateResponse, SavedObjectsBulkGetObject, SavedObjectsBulkResolveObject, SavedObjectsIncrementCounterField, SavedObjectsBulkCreateObject, SavedObjectsBulkResolveResponse, SavedObjectsCreateOptions, SavedObjectsFindResponse, SavedObjectsBulkUpdateResponse, SavedObjectsUpdateObjectsSpacesOptions, SavedObjectsCollectMultiNamespaceReferencesOptions, SavedObjectsRemoveReferencesToResponse, SavedObjectsCheckConflictsObject, SavedObjectsCheckConflictsResponse, SavedObjectsBulkUpdateOptions, SavedObjectsRemoveReferencesToOptions, SavedObjectsDeleteOptions, SavedObjectsOpenPointInTimeResponse, SavedObjectsBulkUpdateObject, SavedObjectsClosePointInTimeResponse, ISavedObjectsPointInTimeFinder, SavedObjectsCreatePointInTimeFinderDependencies, SavedObjectsResolveOptions, SavedObjectsResolveResponse, SavedObjectsCollectMultiNamespaceReferencesObject, SavedObjectsUpdateObjectsSpacesObject, SavedObjectsUpdateObjectsSpacesResponse, SavedObjectsUpdateOptions, SavedObjectsOpenPointInTimeOptions, SavedObjectsClosePointInTimeOptions, SavedObjectsCreatePointInTimeFinderOptions, SavedObjectsFindOptions, SavedObjectsGetOptions, SavedObjectsBulkDeleteObject, SavedObjectsBulkDeleteOptions, SavedObjectsBulkDeleteResponse, SavedObjectsFindInternalOptions, SavedObjectsRawDocSource, SavedObjectsSearchOptions, SavedObjectsSearchResponse, SavedObjectsEsqlOptions, SavedObjectsEsqlResponse, ISavedObjectsRepository, SavedObjectsChangeAccessControlResponse, SavedObjectsChangeAccessControlObject, SavedObjectsChangeAccessModeOptions, SavedObjectsChangeOwnershipOptions } from '@kbn/core-saved-objects-api-server';
import type { ISavedObjectTypeRegistry, SavedObjectsExtensions, SavedObject } from '@kbn/core-saved-objects-server';
import { SavedObjectsSerializer, type IndexMapping, type IKibanaMigrator, type ISavedObjectTypeRegistryInternal } from '@kbn/core-saved-objects-base-server-internal';
/**
 * Constructor options for {@link SavedObjectsRepository}
 * @internal
 */
export interface SavedObjectsRepositoryOptions {
    index: string;
    mappings: IndexMapping;
    client: ElasticsearchClient;
    typeRegistry: ISavedObjectTypeRegistry;
    serializer: SavedObjectsSerializer;
    migrator: IKibanaMigrator;
    allowedTypes: string[];
    logger: Logger;
    extensions?: SavedObjectsExtensions;
    serverTiming?: RequestTiming;
}
/**
 * Saved Objects Repository - the client entry point for all saved object manipulation.
 *
 * The SOR calls the Elasticsearch client and leverages extension implementations to
 * support spaces, security, and encryption features.
 *
 * @internal
 */
export declare class SavedObjectsRepository implements ISavedObjectsRepository {
    private readonly options;
    private readonly migrator;
    private readonly mappings;
    private readonly registry;
    private readonly allowedTypes;
    private readonly client;
    private readonly serializer;
    private readonly logger;
    private readonly apiExecutionContext;
    private readonly extensions;
    private readonly helpers;
    private readonly serverTiming?;
    /**
     * A factory function for creating SavedObjectRepository instances.
     *
     * @internalRemarks Tests are located in ./repository_create_repository.test.ts
     *
     * @internal
     */
    static createRepository(migrator: IKibanaMigrator, typeRegistry: ISavedObjectTypeRegistryInternal, indexName: string, client: ElasticsearchClient, logger: Logger, includedHiddenTypes?: string[], extensions?: SavedObjectsExtensions, serverTiming?: RequestTiming, 
    /** The injectedConstructor is only used for unit testing */
    injectedConstructor?: any): ISavedObjectsRepository;
    private constructor();
    /**
     * {@inheritDoc ISavedObjectsRepository.create}
     */
    create<T = unknown>(type: string, attributes: T, options?: SavedObjectsCreateOptions): Promise<SavedObject<T>>;
    /**
     * {@inheritDoc ISavedObjectsRepository.bulkCreate}
     */
    bulkCreate<T = unknown>(objects: Array<SavedObjectsBulkCreateObject<T>>, options?: SavedObjectsCreateOptions): Promise<SavedObjectsBulkResponse<T>>;
    /**
     * {@inheritDoc ISavedObjectsRepository.checkConflicts}
     */
    checkConflicts(objects?: SavedObjectsCheckConflictsObject[], options?: SavedObjectsBaseOptions): Promise<SavedObjectsCheckConflictsResponse>;
    /**
     * {@inheritDoc ISavedObjectsRepository.delete}
     */
    delete(type: string, id: string, options?: SavedObjectsDeleteOptions): Promise<{}>;
    /**
     *  {@inheritDoc ISavedObjectsRepository.bulkDelete}
     */
    bulkDelete(objects: SavedObjectsBulkDeleteObject[], options?: SavedObjectsBulkDeleteOptions): Promise<SavedObjectsBulkDeleteResponse>;
    /**
     * {@inheritDoc ISavedObjectsRepository.deleteByNamespace}
     */
    deleteByNamespace(namespace: string, options?: SavedObjectsDeleteByNamespaceOptions): Promise<any>;
    /**
     * {@inheritDoc ISavedObjectsRepository.find}
     */
    find<T = unknown, A = unknown>(options: SavedObjectsFindOptions, internalOptions?: SavedObjectsFindInternalOptions): Promise<SavedObjectsFindResponse<T, A>>;
    /**
     * {@inheritDoc ISavedObjectsRepository.search}
     */
    search<T extends SavedObjectsRawDocSource = SavedObjectsRawDocSource, A = unknown>(options: SavedObjectsSearchOptions): Promise<SavedObjectsSearchResponse<T, A>>;
    /**
     * {@inheritDoc ISavedObjectsRepository.esql}
     */
    esql(options: SavedObjectsEsqlOptions): Promise<SavedObjectsEsqlResponse>;
    /**
     * {@inheritDoc ISavedObjectsRepository.bulkGet}
     */
    bulkGet<T = unknown>(objects?: SavedObjectsBulkGetObject[], options?: SavedObjectsGetOptions): Promise<SavedObjectsBulkResponse<T>>;
    /**
     * {@inheritDoc ISavedObjectsRepository.bulkResolve}
     */
    bulkResolve<T = unknown>(objects: SavedObjectsBulkResolveObject[], options?: SavedObjectsResolveOptions): Promise<SavedObjectsBulkResolveResponse<T>>;
    /**
     * {@inheritDoc ISavedObjectsRepository.get}
     */
    get<T = unknown>(type: string, id: string, options?: SavedObjectsGetOptions): Promise<SavedObject<T>>;
    /**
     * {@inheritDoc ISavedObjectsRepository.resolve}
     */
    resolve<T = unknown>(type: string, id: string, options?: SavedObjectsResolveOptions): Promise<SavedObjectsResolveResponse<T>>;
    /**
     * {@inheritDoc ISavedObjectsRepository.update}
     */
    update<T = unknown>(type: string, id: string, attributes: Partial<T>, options?: SavedObjectsUpdateOptions<T>): Promise<SavedObjectsUpdateResponse<T>>;
    /**
     * {@inheritDoc ISavedObjectsRepository.collectMultiNamespaceReferences}
     */
    collectMultiNamespaceReferences(objects: SavedObjectsCollectMultiNamespaceReferencesObject[], options?: SavedObjectsCollectMultiNamespaceReferencesOptions): Promise<import("@kbn/core-saved-objects-api-server").SavedObjectsCollectMultiNamespaceReferencesResponse>;
    /**
     * {@inheritDoc ISavedObjectsRepository.updateObjectsSpaces}
     */
    updateObjectsSpaces(objects: SavedObjectsUpdateObjectsSpacesObject[], spacesToAdd: string[], spacesToRemove: string[], options?: SavedObjectsUpdateObjectsSpacesOptions): Promise<SavedObjectsUpdateObjectsSpacesResponse>;
    /**
     * {@inheritDoc ISavedObjectsRepository.bulkUpdate}
     */
    bulkUpdate<T = unknown>(objects: Array<SavedObjectsBulkUpdateObject<T>>, options?: SavedObjectsBulkUpdateOptions): Promise<SavedObjectsBulkUpdateResponse<T>>;
    /**
     * {@inheritDoc ISavedObjectsRepository.removeReferencesTo}
     */
    removeReferencesTo(type: string, id: string, options?: SavedObjectsRemoveReferencesToOptions): Promise<SavedObjectsRemoveReferencesToResponse>;
    /**
     * {@inheritDoc ISavedObjectsRepository.incrementCounter}
     */
    incrementCounter<T = unknown>(type: string, id: string, counterFields: Array<string | SavedObjectsIncrementCounterField>, options?: SavedObjectsIncrementCounterOptions<T>): Promise<SavedObject<T>>;
    /**
     * {@inheritDoc ISavedObjectsRepository.openPointInTimeForType}
     */
    openPointInTimeForType(type: string | string[], options?: SavedObjectsOpenPointInTimeOptions, internalOptions?: SavedObjectsFindInternalOptions): Promise<SavedObjectsOpenPointInTimeResponse>;
    /**
     * {@inheritDoc ISavedObjectsRepository.closePointInTime}
     */
    closePointInTime(id: string, options?: SavedObjectsClosePointInTimeOptions, internalOptions?: SavedObjectsFindInternalOptions): Promise<SavedObjectsClosePointInTimeResponse>;
    /**
     * {@inheritDoc ISavedObjectsRepository.createPointInTimeFinder}
     */
    createPointInTimeFinder<T = unknown, A = unknown>(findOptions: SavedObjectsCreatePointInTimeFinderOptions, dependencies?: SavedObjectsCreatePointInTimeFinderDependencies, internalOptions?: SavedObjectsFindInternalOptions): ISavedObjectsPointInTimeFinder<T, A>;
    /**
     * {@inheritDoc ISavedObjectsRepository.getCurrentNamespace}
     */
    getCurrentNamespace(namespace?: string): string | undefined;
    /**
     * {@inheritDoc ISavedObjectsRepository.asScopedToNamespace}
     */
    asScopedToNamespace(namespace: string): SavedObjectsRepository;
    /**
     * {@inheritDoc ISavedObjectsRepository.changeOwnership}
     */
    changeOwnership(objects: SavedObjectsChangeAccessControlObject[], options: SavedObjectsChangeOwnershipOptions): Promise<SavedObjectsChangeAccessControlResponse>;
    /**
     * {@inheritDoc ISavedObjectsRepository.changeAccessMode}
     */
    changeAccessMode(objects: SavedObjectsChangeAccessControlObject[], options: SavedObjectsChangeAccessModeOptions): Promise<SavedObjectsChangeAccessControlResponse>;
}
