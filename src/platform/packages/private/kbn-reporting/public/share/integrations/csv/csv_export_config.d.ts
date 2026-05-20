import type { ShareContext, ExportShare } from '@kbn/share-plugin/public';
import type { ReportingCSVSharingData, ReportParamsGetter, ReportParamsGetterOptions } from '../../../types';
import type { CsvSearchModeParams } from '../../shared/get_search_csv_job_params';
import type { ExportModalShareOpts } from '../../share_context_menu';
export declare const getCsvReportParams: ReportParamsGetter<ReportParamsGetterOptions<ReportingCSVSharingData> & {
    forShareUrl?: boolean;
    useAbsoluteTime?: boolean;
}, CsvSearchModeParams>;
/**
 * @description Returns config for the CSV export integration
 */
export declare const getShareMenuItems: ({ apiClient, startServices$, csvConfig, isServerless }: ExportModalShareOpts) => ({ objectType, sharingData, shareableUrlLocatorParams, }: ShareContext<ReportingCSVSharingData>) => Awaited<ReturnType<ExportShare<ReportingCSVSharingData>["config"]>>;
