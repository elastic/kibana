import type * as TaskEither from 'fp-ts/TaskEither';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { type RetryableEsClientError } from './catch_retryable_es_client_errors';
import type { IndexNotFound } from '.';
export interface AliasNotFound {
    type: 'alias_not_found_exception';
}
/** @internal */
export interface RemoveIndexNotAConcreteIndex {
    type: 'remove_index_not_a_concrete_index';
}
/** @internal */
export type AliasAction = {
    remove_index: {
        index: string;
    };
} | {
    remove: {
        index: string;
        alias: string;
        must_exist: boolean;
    };
} | {
    add: {
        index: string;
        alias: string;
    };
};
/** @internal */
export interface UpdateAliasesParams {
    client: ElasticsearchClient;
    aliasActions: AliasAction[];
    timeout?: string;
}
/**
 * Calls the Update index alias API `_alias` with the provided alias actions.
 */
export declare const updateAliases: ({ client, aliasActions, timeout, }: UpdateAliasesParams) => TaskEither.TaskEither<IndexNotFound | AliasNotFound | RemoveIndexNotAConcreteIndex | RetryableEsClientError, "update_aliases_succeeded">;
