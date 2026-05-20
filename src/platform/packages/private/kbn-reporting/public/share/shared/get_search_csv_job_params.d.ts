import { CSV_JOB_TYPE_V2, CSV_JOB_TYPE } from '@kbn/reporting-export-types-csv-common';
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import type { LocatorParams, BaseParams } from '@kbn/reporting-common/types';
import type { ReportingAPIClient } from '../../reporting_api_client';
export type CsvSearchModeParams = {
    isEsqlMode: false;
    searchSource: SerializedSearchSourceFields;
    columns: string[] | undefined;
} | {
    isEsqlMode: true;
    locatorParams: LocatorParams[];
};
interface GetSearchCsvJobParams {
    apiClient: ReportingAPIClient;
    searchModeParams: CsvSearchModeParams;
    title: string;
}
export declare const getSearchCsvJobParams: ({ apiClient, searchModeParams, title, }: GetSearchCsvJobParams) => {
    reportType: typeof CSV_JOB_TYPE_V2 | typeof CSV_JOB_TYPE;
    decoratedJobParams: BaseParams;
};
export {};
