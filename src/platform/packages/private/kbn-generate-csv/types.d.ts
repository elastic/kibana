import type { SerializedSearchSourceFields } from '@kbn/data-plugin/public';
/**
 * Duplicated from @kbn/reporting-export-types-csv-common to reduce dependencies
 */
export type CsvPagingStrategy = 'pit' | 'scroll';
export interface JobParamsCSV {
    browserTimezone?: string;
    searchSource: SerializedSearchSourceFields;
    columns?: string[];
    forceNow?: string;
    pagingStrategy?: CsvPagingStrategy;
}
