import type { estypes } from '@elastic/elasticsearch';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { ElasticRequestState } from '@kbn/unified-doc-viewer';
type RequestBody = estypes.SearchRequest;
export interface EsDocSearchProps {
    /**
     * Id of the doc in ES
     */
    id: string;
    /**
     * Index in ES to query
     */
    index: string | undefined;
    /**
     * DataView entity
     */
    dataView: DataView;
    /**
     * Record fetched from ES|QL query
     */
    esqlHit?: DataTableRecord;
    /**
     * An optional callback that will be called before fetching the doc
     */
    onBeforeFetch?: () => Promise<void>;
    /**
     * An optional callback that will be called after fetching the doc
     * @param record
     */
    onProcessRecord?: (record: DataTableRecord) => DataTableRecord;
    /**
     * Skip fetching when data is already available (e.g. from cache)
     */
    skip?: boolean;
}
/**
 * Custom react hook for querying a single doc in ElasticSearch
 */
export declare function useEsDocSearch({ id, index, dataView, esqlHit, onBeforeFetch, onProcessRecord, skip, }: EsDocSearchProps): [ElasticRequestState, DataTableRecord | null, () => void];
/**
 * helper function to build a query body for Elasticsearch
 * https://www.elastic.co/guide/en/elasticsearch/reference/current//query-dsl-ids-query.html
 */
export declare function buildSearchBody(id: string, index: string, dataView: DataView): RequestBody;
export {};
