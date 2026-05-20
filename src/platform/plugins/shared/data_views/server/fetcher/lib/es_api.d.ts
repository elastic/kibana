import type { ElasticsearchClient } from '@kbn/core/server';
import type { ExpandWildcard, MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type { QueryDslQueryContainer } from '../../../common/types';
/**
 *  Call the index.getAlias API for a list of indices.
 *
 *  If `indices` is an array or comma-separated list and some of the
 *  values don't match anything but others do this will return the
 *  matches and not throw an error.
 *
 *  If not a single index matches then a NoMatchingIndicesError will
 *  be thrown.
 *
 *  @param  {Function} callCluster bound function for accessing an es client
 *  @param  {Array<String>|String} indices
 *  @return {Promise<IndexAliasResponse>}
 */
export declare function callIndexAliasApi(callCluster: ElasticsearchClient, indices: string[] | string): Promise<import("@elastic/elasticsearch/lib/api/types").IndicesGetAliasResponse>;
interface FieldCapsApiParams {
    callCluster: ElasticsearchClient;
    indices: string[] | string;
    fieldCapsOptions?: {
        allow_no_indices: boolean;
        include_unmapped?: boolean;
    };
    indexFilter?: QueryDslQueryContainer;
    fields?: string[];
    expandWildcards?: ExpandWildcard;
    fieldTypes?: string[];
    includeEmptyFields?: boolean;
    runtimeMappings?: MappingRuntimeFields;
    abortSignal?: AbortSignal;
    projectRouting?: string;
}
/**
 *  Call the fieldCaps API for a list of indices.
 *
 *  Just like callIndexAliasApi(), callFieldCapsApi() throws
 *  if no indexes are matched, but will return potentially
 *  "partial" results if even a single index is matched.
 *
 *  @param  {Function} callCluster bound function for accessing an es client
 *  @param  {Array<String>|String} indices
 *  @param  {Object} fieldCapsOptions
 *  @return {Promise<FieldCapsResponse>}
 */
export declare function callFieldCapsApi(params: FieldCapsApiParams): Promise<import("@elastic/elasticsearch").TransportResult<import("@elastic/elasticsearch/lib/api/types").FieldCapsResponse, unknown> | {
    body: {
        indices: never[];
        fields: {};
    };
}>;
export {};
