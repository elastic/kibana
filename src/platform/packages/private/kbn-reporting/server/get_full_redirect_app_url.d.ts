import type { ReportingServerInfo } from '@kbn/reporting-common/types';
import type { ReportingConfigType } from '.';
export declare function getFullRedirectAppUrl(config: ReportingConfigType, serverInfo: ReportingServerInfo, spaceId?: string, forceNow?: string): string;
