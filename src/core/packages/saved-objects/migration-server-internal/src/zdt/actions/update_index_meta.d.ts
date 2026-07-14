import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { IndexMappingMeta } from '@kbn/core-saved-objects-base-server-internal';
import { updateMappings } from '../../actions';
export interface UpdateIndexMetaParams {
    client: ElasticsearchClient;
    index: string;
    meta: IndexMappingMeta;
}
export declare const updateIndexMeta: ({ client, index, meta, }: UpdateIndexMetaParams) => ReturnType<typeof updateMappings>;
