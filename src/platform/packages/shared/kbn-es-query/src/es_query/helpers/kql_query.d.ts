import type { estypes } from '@elastic/elasticsearch';
import type { DataViewBase, KueryParseOptions, KueryQueryOptions } from '../../..';
import type { KqlContext } from '../../kuery/types';
interface ElasticsearchQueryOptions {
    indexPattern?: DataViewBase;
    config?: KueryQueryOptions;
    context?: KqlContext;
}
export declare function kqlQuery(kql?: string, parseOptions?: Partial<KueryParseOptions>, esQueryOptions?: Partial<ElasticsearchQueryOptions>): estypes.QueryDslQueryContainer[];
export {};
