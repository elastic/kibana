import type { ExpandWildcard, MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, IUiSettingsClient } from '@kbn/core/server';
import type { FieldDescriptor } from '../../index_patterns_fetcher';
import type { QueryDslQueryContainer } from '../../../../common/types';
interface FieldCapabilitiesParams {
    callCluster: ElasticsearchClient;
    uiSettingsClient?: IUiSettingsClient;
    indices: string | string[];
    metaFields: string[];
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
 *  Get the field capabilities for field in `indices`, excluding
 *  all internal/underscore-prefixed fields that are not in `metaFields`
 *
 *  @param  {Function} callCluster bound function for accessing an es client
 *  @param  {Array}  [indices=[]]  the list of indexes to check
 *  @param  {Array}  [metaFields=[]] the list of internal fields to include
 *  @param  {Object} fieldCapsOptions
 *  @return {Promise<{ fields: Array<FieldDescriptor>, indices: Array<string>>}>}
 */
export declare function getFieldCapabilities(params: FieldCapabilitiesParams): Promise<{
    fields: FieldDescriptor[];
    indices: string[];
}>;
export {};
