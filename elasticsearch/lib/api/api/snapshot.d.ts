import { Transport, TransportRequestOptions, TransportRequestOptionsWithMeta, TransportRequestOptionsWithOutMeta, TransportResult } from '@elastic/transport';
import * as T from '../types';
import * as TB from '../typesWithBodyKey';
interface That {
    transport: Transport;
}
export default class Snapshot {
    transport: Transport;
    constructor(transport: Transport);
    /**
      * Triggers the review of a snapshot repository’s contents and deletes any stale data not referenced by existing snapshots.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/clean-up-snapshot-repo-api.html | Elasticsearch API documentation}
      */
    cleanupRepository(this: That, params: T.SnapshotCleanupRepositoryRequest | TB.SnapshotCleanupRepositoryRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SnapshotCleanupRepositoryResponse>;
    cleanupRepository(this: That, params: T.SnapshotCleanupRepositoryRequest | TB.SnapshotCleanupRepositoryRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SnapshotCleanupRepositoryResponse, unknown>>;
    cleanupRepository(this: That, params: T.SnapshotCleanupRepositoryRequest | TB.SnapshotCleanupRepositoryRequest, options?: TransportRequestOptions): Promise<T.SnapshotCleanupRepositoryResponse>;
    /**
      * Clones indices from one snapshot into another snapshot in the same repository.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/modules-snapshots.html | Elasticsearch API documentation}
      */
    clone(this: That, params: T.SnapshotCloneRequest | TB.SnapshotCloneRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SnapshotCloneResponse>;
    clone(this: That, params: T.SnapshotCloneRequest | TB.SnapshotCloneRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SnapshotCloneResponse, unknown>>;
    clone(this: That, params: T.SnapshotCloneRequest | TB.SnapshotCloneRequest, options?: TransportRequestOptions): Promise<T.SnapshotCloneResponse>;
    /**
      * Creates a snapshot in a repository.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/modules-snapshots.html | Elasticsearch API documentation}
      */
    create(this: That, params: T.SnapshotCreateRequest | TB.SnapshotCreateRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SnapshotCreateResponse>;
    create(this: That, params: T.SnapshotCreateRequest | TB.SnapshotCreateRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SnapshotCreateResponse, unknown>>;
    create(this: That, params: T.SnapshotCreateRequest | TB.SnapshotCreateRequest, options?: TransportRequestOptions): Promise<T.SnapshotCreateResponse>;
    /**
      * Creates a repository.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/modules-snapshots.html | Elasticsearch API documentation}
      */
    createRepository(this: That, params: T.SnapshotCreateRepositoryRequest | TB.SnapshotCreateRepositoryRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SnapshotCreateRepositoryResponse>;
    createRepository(this: That, params: T.SnapshotCreateRepositoryRequest | TB.SnapshotCreateRepositoryRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SnapshotCreateRepositoryResponse, unknown>>;
    createRepository(this: That, params: T.SnapshotCreateRepositoryRequest | TB.SnapshotCreateRepositoryRequest, options?: TransportRequestOptions): Promise<T.SnapshotCreateRepositoryResponse>;
    /**
      * Deletes one or more snapshots.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/modules-snapshots.html | Elasticsearch API documentation}
      */
    delete(this: That, params: T.SnapshotDeleteRequest | TB.SnapshotDeleteRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SnapshotDeleteResponse>;
    delete(this: That, params: T.SnapshotDeleteRequest | TB.SnapshotDeleteRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SnapshotDeleteResponse, unknown>>;
    delete(this: That, params: T.SnapshotDeleteRequest | TB.SnapshotDeleteRequest, options?: TransportRequestOptions): Promise<T.SnapshotDeleteResponse>;
    /**
      * Deletes a repository.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/modules-snapshots.html | Elasticsearch API documentation}
      */
    deleteRepository(this: That, params: T.SnapshotDeleteRepositoryRequest | TB.SnapshotDeleteRepositoryRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SnapshotDeleteRepositoryResponse>;
    deleteRepository(this: That, params: T.SnapshotDeleteRepositoryRequest | TB.SnapshotDeleteRepositoryRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SnapshotDeleteRepositoryResponse, unknown>>;
    deleteRepository(this: That, params: T.SnapshotDeleteRepositoryRequest | TB.SnapshotDeleteRepositoryRequest, options?: TransportRequestOptions): Promise<T.SnapshotDeleteRepositoryResponse>;
    /**
      * Returns information about a snapshot.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/modules-snapshots.html | Elasticsearch API documentation}
      */
    get(this: That, params: T.SnapshotGetRequest | TB.SnapshotGetRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SnapshotGetResponse>;
    get(this: That, params: T.SnapshotGetRequest | TB.SnapshotGetRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SnapshotGetResponse, unknown>>;
    get(this: That, params: T.SnapshotGetRequest | TB.SnapshotGetRequest, options?: TransportRequestOptions): Promise<T.SnapshotGetResponse>;
    /**
      * Returns information about a repository.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/modules-snapshots.html | Elasticsearch API documentation}
      */
    getRepository(this: That, params?: T.SnapshotGetRepositoryRequest | TB.SnapshotGetRepositoryRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SnapshotGetRepositoryResponse>;
    getRepository(this: That, params?: T.SnapshotGetRepositoryRequest | TB.SnapshotGetRepositoryRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SnapshotGetRepositoryResponse, unknown>>;
    getRepository(this: That, params?: T.SnapshotGetRepositoryRequest | TB.SnapshotGetRepositoryRequest, options?: TransportRequestOptions): Promise<T.SnapshotGetRepositoryResponse>;
    /**
      * Analyzes a repository for correctness and performance
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/modules-snapshots.html | Elasticsearch API documentation}
      */
    repositoryAnalyze(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithOutMeta): Promise<T.TODO>;
    repositoryAnalyze(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.TODO, unknown>>;
    repositoryAnalyze(this: That, params?: T.TODO | TB.TODO, options?: TransportRequestOptions): Promise<T.TODO>;
    /**
      * Restores a snapshot.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/modules-snapshots.html | Elasticsearch API documentation}
      */
    restore(this: That, params: T.SnapshotRestoreRequest | TB.SnapshotRestoreRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SnapshotRestoreResponse>;
    restore(this: That, params: T.SnapshotRestoreRequest | TB.SnapshotRestoreRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SnapshotRestoreResponse, unknown>>;
    restore(this: That, params: T.SnapshotRestoreRequest | TB.SnapshotRestoreRequest, options?: TransportRequestOptions): Promise<T.SnapshotRestoreResponse>;
    /**
      * Returns information about the status of a snapshot.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/modules-snapshots.html | Elasticsearch API documentation}
      */
    status(this: That, params?: T.SnapshotStatusRequest | TB.SnapshotStatusRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SnapshotStatusResponse>;
    status(this: That, params?: T.SnapshotStatusRequest | TB.SnapshotStatusRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SnapshotStatusResponse, unknown>>;
    status(this: That, params?: T.SnapshotStatusRequest | TB.SnapshotStatusRequest, options?: TransportRequestOptions): Promise<T.SnapshotStatusResponse>;
    /**
      * Verifies a repository.
      * @see {@link https://www.elastic.co/guide/en/elasticsearch/reference/8.15/modules-snapshots.html | Elasticsearch API documentation}
      */
    verifyRepository(this: That, params: T.SnapshotVerifyRepositoryRequest | TB.SnapshotVerifyRepositoryRequest, options?: TransportRequestOptionsWithOutMeta): Promise<T.SnapshotVerifyRepositoryResponse>;
    verifyRepository(this: That, params: T.SnapshotVerifyRepositoryRequest | TB.SnapshotVerifyRepositoryRequest, options?: TransportRequestOptionsWithMeta): Promise<TransportResult<T.SnapshotVerifyRepositoryResponse, unknown>>;
    verifyRepository(this: That, params: T.SnapshotVerifyRepositoryRequest | TB.SnapshotVerifyRepositoryRequest, options?: TransportRequestOptions): Promise<T.SnapshotVerifyRepositoryResponse>;
}
export {};
