import type { estypes } from '@elastic/elasticsearch';
import type { ISearchSource } from '@kbn/data-plugin/common';
/**
 * Type to wrap the untyped object returned when
 * getting the query from SearchSource service
 */
export interface QueryInspection {
    requestBody: estypes.SearchRequest;
}
/**
 * @internal
 */
interface CsvConfigType {
    scroll: {
        size: number;
        duration: string;
    };
}
/**
 * A utility to get the query from a CSV reporting job to inspect or analyze
 * @public
 */
export declare const getQueryFromCsvJob: (searchSource: ISearchSource, { scroll: config }: CsvConfigType, pitId?: string) => QueryInspection;
export {};
