import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
type CleanableState = {
    sourceIndexPitId: string;
} | {};
export declare function cleanup(client: ElasticsearchClient, state?: CleanableState): Promise<void>;
export {};
