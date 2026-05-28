import type { estypes } from '@elastic/elasticsearch';
export declare const LOCAL_CLUSTER_KEY = "(local)";
export declare function getLocalClusterDetails(rawResponse: estypes.SearchResponse): {
    status: estypes.ClusterSearchStatus;
    indices: string;
    took: number;
    timed_out: boolean;
    _shards: {
        failed: estypes.uint;
        successful: estypes.uint;
        total: estypes.uint;
        failures?: estypes.ShardFailure[];
        skipped?: estypes.uint;
    };
    failures: estypes.ShardFailure[] | undefined;
};
