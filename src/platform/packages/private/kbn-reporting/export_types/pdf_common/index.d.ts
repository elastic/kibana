import type { BaseParams, BasePayload, LocatorParams } from '@kbn/reporting-common/types';
import type { LayoutParams } from '@kbn/screenshotting-plugin/common';
export * from './constants';
/**
 * Structure of stored job data provided by create_job
 */
export interface TaskPayloadPDF extends BasePayload {
    layout: LayoutParams;
    forceNow?: string;
    objects: Array<{
        relativeUrl: string;
    }>;
}
interface BaseParamsPDFV2 {
    layout: LayoutParams;
    /**
     * This value is used to re-create the same visual state as when the report was requested as well as navigate to the correct page.
     */
    locatorParams: LocatorParams[];
}
export type JobParamsPDFV2 = BaseParamsPDFV2 & BaseParams;
/**
 * Public-facing interface
 * Apps should use this interface to build job params.
 * browserTimezone and version is provided by Reporting
 * @public
 */
export type JobAppParamsPDFV2 = Omit<JobParamsPDFV2, 'browserTimezone' | 'version'>;
export interface TaskPayloadPDFV2 extends BasePayload, BaseParamsPDFV2 {
    layout: LayoutParams;
    /**
     * The value of forceNow is injected server-side every time a given report is generated.
     */
    forceNow: string;
}
/**
 * @deprecated
 */
interface BaseParamsPDF {
    layout: LayoutParams;
    relativeUrls: string[];
    isDeprecated?: boolean;
}
/**
 * @deprecated
 */
export type JobParamsPDFDeprecated = BaseParamsPDF & BaseParams;
