import type { ReportingServerInfo } from '@kbn/reporting-common/types';
import type { TaskPayloadPDF } from '@kbn/reporting-export-types-pdf-common';
import type { ReportingConfigType } from '@kbn/reporting-server';
export declare function getFullUrls(serverInfo: ReportingServerInfo, config: ReportingConfigType, job: TaskPayloadPDF): string[];
