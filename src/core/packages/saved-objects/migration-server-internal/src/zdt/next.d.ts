/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  AllActionStates,
  State,
  InitState,
  CreateTargetIndexState,
  UpdateIndexMappingsState,
  UpdateIndexMappingsWaitForTaskState,
  UpdateMappingModelVersionState,
  UpdateAliasesState,
  CleanupUnknownAndExcludedDocsState,
  CleanupUnknownAndExcludedDocsWaitForTaskState,
  DocumentsUpdateInitState,
  IndexStateUpdateDoneState,
  OutdatedDocumentsSearchBulkIndexState,
  OutdatedDocumentsSearchClosePitState,
  OutdatedDocumentsSearchOpenPitState,
  OutdatedDocumentsSearchReadState,
  OutdatedDocumentsSearchTransformState,
  CleanupUnknownAndExcludedDocsRefreshState,
  SetDocMigrationStartedState,
  SetDocMigrationStartedWaitForInstancesState,
  OutdatedDocumentsSearchRefreshState,
  UpdateDocumentModelVersionsState,
  UpdateDocumentModelVersionsWaitForInstancesState,
} from './state';
import type { MigratorContext } from './context';
import type * as Actions from './actions';
export type ActionMap = ReturnType<typeof nextActionMap>;
/**
 * The response type of the provided control state's action.
 *
 * E.g. given 'INIT', provides the response type of the action triggered by
 * `next` in the 'INIT' control state.
 */
export type ResponseType<ControlState extends AllActionStates> = Awaited<
  ReturnType<ReturnType<ActionMap[ControlState]>>
>;
export declare const nextActionMap: (context: MigratorContext) => {
  INIT: (
    state: InitState
  ) => import('fp-ts/lib/TaskEither').TaskEither<
    Actions.RetryableEsClientError,
    import('../actions').FetchIndexResponse
  >;
  CREATE_TARGET_INDEX: (
    state: CreateTargetIndexState
  ) => import('fp-ts/lib/TaskEither').TaskEither<
    | import('../actions').ClusterShardLimitExceeded
    | import('../actions').IndexNotGreenTimeout
    | Actions.RetryableEsClientError,
    import('../actions/create_index').CreateIndexSuccessResponse
  >;
  UPDATE_INDEX_MAPPINGS: (
    state: UpdateIndexMappingsState
  ) => import('fp-ts/lib/TaskEither').TaskEither<
    Actions.RetryableEsClientError,
    import('../actions').UpdateAndPickupMappingsResponse
  >;
  UPDATE_INDEX_MAPPINGS_WAIT_FOR_TASK: (
    state: UpdateIndexMappingsWaitForTaskState
  ) => import('fp-ts/lib/TaskEither').TaskEither<
    | Actions.RetryableEsClientError
    | import('../actions/wait_for_task').TaskCompletedWithRetriableError
    | Actions.WaitForTaskCompletionTimeout,
    'pickup_updated_mappings_succeeded'
  >;
  UPDATE_MAPPING_MODEL_VERSIONS: (
    state: UpdateMappingModelVersionState
  ) => import('fp-ts/lib/TaskEither').TaskEither<
    import('../actions').IncompatibleMappingException | Actions.RetryableEsClientError,
    'update_mappings_succeeded'
  >;
  UPDATE_ALIASES: (
    state: UpdateAliasesState
  ) => import('fp-ts/lib/TaskEither').TaskEither<
    | import('../actions').AliasNotFound
    | Actions.IndexNotFound
    | import('../actions').RemoveIndexNotAConcreteIndex
    | Actions.RetryableEsClientError,
    'update_aliases_succeeded'
  >;
  INDEX_STATE_UPDATE_DONE: (
    state: IndexStateUpdateDoneState
  ) => () => Promise<import('fp-ts/lib/Either').Either<never, 'noop'>>;
  DOCUMENTS_UPDATE_INIT: (
    state: DocumentsUpdateInitState
  ) => () => Promise<import('fp-ts/lib/Either').Either<never, 'noop'>>;
  SET_DOC_MIGRATION_STARTED: (
    state: SetDocMigrationStartedState
  ) => import('fp-ts/lib/TaskEither').TaskEither<
    import('../actions').IncompatibleMappingException | Actions.RetryableEsClientError,
    'update_mappings_succeeded'
  >;
  SET_DOC_MIGRATION_STARTED_WAIT_FOR_INSTANCES: (
    state: SetDocMigrationStartedWaitForInstancesState
  ) => import('fp-ts/lib/TaskEither').TaskEither<never, 'wait_succeeded'>;
  CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS: (
    state: CleanupUnknownAndExcludedDocsState
  ) => import('fp-ts/lib/TaskEither').TaskEither<
    Actions.RetryableEsClientError | import('../actions').UnknownDocsFound,
    | import('../actions/cleanup_unknown_and_excluded').CleanupNotNeeded
    | import('../actions/cleanup_unknown_and_excluded').CleanupStarted
  >;
  CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_WAIT_FOR_TASK: (
    state: CleanupUnknownAndExcludedDocsWaitForTaskState
  ) => import('fp-ts/lib/TaskEither').TaskEither<
    | import('../actions/wait_for_delete_by_query_task').CleanupErrorResponse
    | Actions.RetryableEsClientError
    | Actions.WaitForTaskCompletionTimeout,
    import('../actions/wait_for_delete_by_query_task').CleanupSuccessfulResponse
  >;
  CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS_REFRESH: (
    state: CleanupUnknownAndExcludedDocsRefreshState
  ) => import('fp-ts/lib/TaskEither').TaskEither<
    Actions.RetryableEsClientError,
    {
      refreshed: boolean;
    }
  >;
  OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT: (
    state: OutdatedDocumentsSearchOpenPitState
  ) => import('fp-ts/lib/TaskEither').TaskEither<
    Actions.RetryableEsClientError,
    import('../actions').OpenPitResponse
  >;
  OUTDATED_DOCUMENTS_SEARCH_READ: (
    state: OutdatedDocumentsSearchReadState
  ) => import('fp-ts/lib/TaskEither').TaskEither<
    import('../actions').EsResponseTooLargeError | Actions.RetryableEsClientError,
    import('../actions').ReadWithPit
  >;
  OUTDATED_DOCUMENTS_SEARCH_TRANSFORM: (
    state: OutdatedDocumentsSearchTransformState
  ) => import('fp-ts/lib/TaskEither').TaskEither<
    import('../core').DocumentsTransformFailed,
    import('../core').DocumentsTransformSuccess
  >;
  OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX: (
    state: OutdatedDocumentsSearchBulkIndexState
  ) => import('fp-ts/lib/TaskEither').TaskEither<
    | Actions.IndexNotFound
    | import('../actions').RequestEntityTooLargeException
    | Actions.RetryableEsClientError
    | import('../actions').TargetIndexHadWriteBlock
    | import('../actions').UnavailableShardsException,
    'bulk_index_succeeded'
  >;
  OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT: (
    state: OutdatedDocumentsSearchClosePitState
  ) => import('fp-ts/lib/TaskEither').TaskEither<Actions.RetryableEsClientError, {}>;
  OUTDATED_DOCUMENTS_SEARCH_REFRESH: (
    state: OutdatedDocumentsSearchRefreshState
  ) => import('fp-ts/lib/TaskEither').TaskEither<
    Actions.RetryableEsClientError,
    {
      refreshed: boolean;
    }
  >;
  UPDATE_DOCUMENT_MODEL_VERSIONS: (
    state: UpdateDocumentModelVersionsState
  ) => import('fp-ts/lib/TaskEither').TaskEither<
    import('../actions').IncompatibleMappingException | Actions.RetryableEsClientError,
    'update_mappings_succeeded'
  >;
  UPDATE_DOCUMENT_MODEL_VERSIONS_WAIT_FOR_INSTANCES: (
    state: UpdateDocumentModelVersionsWaitForInstancesState
  ) => import('fp-ts/lib/TaskEither').TaskEither<never, 'wait_succeeded'>;
};
export declare const next: (context: MigratorContext) => (state: State) =>
  | (() =>
      | Promise<import('fp-ts/lib/Either').Either<never, 'noop'>>
      | Promise<import('fp-ts/lib/Either').Either<never, 'wait_succeeded'>>
      | Promise<
          import('fp-ts/lib/Either').Either<
            import('../core').DocumentsTransformFailed,
            import('../core').DocumentsTransformSuccess
          >
        >
      | Promise<
          import('fp-ts/lib/Either').Either<
            Actions.RetryableEsClientError,
            import('../actions').FetchIndexResponse
          >
        >
      | Promise<
          import('fp-ts/lib/Either').Either<
            Actions.RetryableEsClientError,
            import('../actions').OpenPitResponse
          >
        >
      | Promise<
          import('fp-ts/lib/Either').Either<
            Actions.RetryableEsClientError,
            import('../actions').UpdateAndPickupMappingsResponse
          >
        >
      | Promise<
          import('fp-ts/lib/Either').Either<
            Actions.RetryableEsClientError,
            {
              refreshed: boolean;
            }
          >
        >
      | Promise<import('fp-ts/lib/Either').Either<Actions.RetryableEsClientError, {}>>
      | Promise<
          import('fp-ts/lib/Either').Either<
            import('../actions').EsResponseTooLargeError | Actions.RetryableEsClientError,
            import('../actions').ReadWithPit
          >
        >
      | Promise<
          import('fp-ts/lib/Either').Either<
            import('../actions').IncompatibleMappingException | Actions.RetryableEsClientError,
            'update_mappings_succeeded'
          >
        >
      | Promise<
          import('fp-ts/lib/Either').Either<
            Actions.RetryableEsClientError | import('../actions').UnknownDocsFound,
            | import('../actions/cleanup_unknown_and_excluded').CleanupNotNeeded
            | import('../actions/cleanup_unknown_and_excluded').CleanupStarted
          >
        >
      | Promise<
          import('fp-ts/lib/Either').Either<
            | import('../actions/wait_for_delete_by_query_task').CleanupErrorResponse
            | Actions.RetryableEsClientError
            | Actions.WaitForTaskCompletionTimeout,
            import('../actions/wait_for_delete_by_query_task').CleanupSuccessfulResponse
          >
        >
      | Promise<
          import('fp-ts/lib/Either').Either<
            | import('../actions').ClusterShardLimitExceeded
            | import('../actions').IndexNotGreenTimeout
            | Actions.RetryableEsClientError,
            import('../actions/create_index').CreateIndexSuccessResponse
          >
        >
      | Promise<
          import('fp-ts/lib/Either').Either<
            | Actions.RetryableEsClientError
            | import('../actions/wait_for_task').TaskCompletedWithRetriableError
            | Actions.WaitForTaskCompletionTimeout,
            'pickup_updated_mappings_succeeded'
          >
        >
      | Promise<
          import('fp-ts/lib/Either').Either<
            | import('../actions').AliasNotFound
            | Actions.IndexNotFound
            | import('../actions').RemoveIndexNotAConcreteIndex
            | Actions.RetryableEsClientError,
            'update_aliases_succeeded'
          >
        >
      | Promise<
          import('fp-ts/lib/Either').Either<
            | Actions.IndexNotFound
            | import('../actions').RequestEntityTooLargeException
            | Actions.RetryableEsClientError
            | import('../actions').TargetIndexHadWriteBlock
            | import('../actions').UnavailableShardsException,
            'bulk_index_succeeded'
          >
        >)
  | null;
