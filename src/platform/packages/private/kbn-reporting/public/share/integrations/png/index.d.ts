import type { ExportShare, RegisterShareIntegrationArgs } from '@kbn/share-plugin/public';
import type { ExportModalShareOpts } from '../../share_context_menu';
export declare const reportingPNGExportShareIntegration: ({ apiClient, startServices$, }: ExportModalShareOpts) => RegisterShareIntegrationArgs<ExportShare>;
