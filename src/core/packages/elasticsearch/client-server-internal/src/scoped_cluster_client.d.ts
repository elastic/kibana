import type { ElasticsearchClient, IScopedClusterClient } from '@kbn/core-elasticsearch-server';
/** @internal **/
export declare class ScopedClusterClient implements IScopedClusterClient {
    #private;
    readonly asInternalUser: ElasticsearchClient;
    constructor({ asInternalUser, asCurrentUserFactory, asSecondaryAuthUserFactory, }: {
        asInternalUser: ElasticsearchClient;
        asCurrentUserFactory: () => ElasticsearchClient;
        asSecondaryAuthUserFactory: () => ElasticsearchClient;
    });
    get asCurrentUser(): ElasticsearchClient;
    get asSecondaryAuthUser(): ElasticsearchClient;
}
