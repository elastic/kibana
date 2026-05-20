import type { SavedObjectsClientContract, ElasticsearchClient } from '@kbn/core/server';
import type { AggsCommonSetup, AggsStart as Start } from '../../../common';
export type AggsSetup = AggsCommonSetup;
export interface AggsStart {
    asScopedToClient: (savedObjectsClient: SavedObjectsClientContract, elasticsearchClient: ElasticsearchClient) => Promise<Start>;
}
