import type { IEsSearchRequest, IEsSearchResponse } from '@kbn/search-types';
import type { MappingRuntimeFields, QueryDslFieldAndFormat, QueryDslQueryContainer, SortCombinations } from '@elastic/elasticsearch/lib/api/types';
import type { Alert } from './alerts_types';
export type RuleRegistrySearchRequest = IEsSearchRequest & {
    ruleTypeIds: string[];
    consumers?: string[];
    fields?: QueryDslFieldAndFormat[];
    query?: Pick<NonNullable<QueryDslQueryContainer>, 'bool' | 'ids'>;
    sort?: SortCombinations[];
    pagination?: RuleRegistrySearchRequestPagination;
    runtimeMappings?: MappingRuntimeFields;
    minScore?: number;
    trackScores?: boolean;
    includeDelayedAlerts?: boolean;
};
export interface RuleRegistrySearchRequestPagination {
    pageIndex: number;
    pageSize: number;
}
export interface RuleRegistryInspect {
    dsl: string[];
}
export interface RuleRegistrySearchResponse extends IEsSearchResponse<Alert> {
    inspect?: RuleRegistryInspect;
}
