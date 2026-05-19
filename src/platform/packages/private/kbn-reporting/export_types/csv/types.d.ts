import type { CustomRequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { ReportingServerPluginSetup } from '@kbn/reporting-server';
/**
 * Needed because of CsvSearchSourceImmediateExportType
 * @internal
 */
export type ReportingRequestHandlerContext = CustomRequestHandlerContext<{
    reporting: ReportingServerPluginSetup | null;
}>;
