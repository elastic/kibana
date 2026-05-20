import type { ExportShare, RegisterShareIntegrationArgs } from '@kbn/share-plugin/public';
import type { ExportModalShareOpts } from '../../share_context_menu';
import type { ReportingCSVSharingData } from '../../../types';
export declare const reportingCsvExportShareIntegration: ({ apiClient, startServices$, csvConfig, isServerless, }: ExportModalShareOpts) => RegisterShareIntegrationArgs<ExportShare<ReportingCSVSharingData>>;
