import type { SerializedSearchSourceFields } from '@kbn/data-plugin/public';
import type { BaseParams, BaseParamsV2, BasePayload, BasePayloadV2, CsvPagingStrategy, LocatorParams } from '@kbn/reporting-common/types';
export * from './constants';
interface BaseParamsCSV {
    searchSource: SerializedSearchSourceFields;
    columns?: string[];
}
interface BaseParamsCsvV2 {
    locatorParams: LocatorParams[];
}
export type JobParamsCSV = BaseParamsCSV & BaseParams;
export type JobParamsCsvV2 = BaseParamsCsvV2 & BaseParams;
export type TaskPayloadCSV = BaseParamsCSV & BasePayload;
/**
 * Public-facing interface
 * Apps should use this interface to build job params. The browserTimezone and version
 * fields become automatically provided by Reporting
 * @public
 */
export type JobAppParamsCSV = Omit<JobParamsCSV, 'browserTimezone' | 'version'>;
export type JobAppParamsCsvV2 = Omit<JobParamsCsvV2, 'browserTimezone' | 'version'>;
interface CsvFromSavedObjectBase {
    objectType: 'search';
}
/**
 * Makes title optional, as it can be derived from the saved search object
 */
export type JobParamsCsvFromSavedObject = CsvFromSavedObjectBase & Omit<BaseParamsV2, 'title'> & {
    title?: string;
};
export interface TaskPayloadCsvFromSavedObject extends CsvFromSavedObjectBase, BasePayloadV2 {
    objectType: 'search';
    pagingStrategy: CsvPagingStrategy;
}
export declare const CSV_REPORTING_ACTION = "generateCsvReport";
/**
 * @deprecated
 * Supported in case older reports exist in storage
 */
export declare const CSV_JOB_TYPE_DEPRECATED = "csv";
export { getQueryFromCsvJob, type QueryInspection } from './lib/get_query_from_job';
