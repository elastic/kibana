import type { BaseParams, BasePayload, LocatorParams } from '@kbn/reporting-common/types';
import type { LayoutParams } from '@kbn/screenshotting-plugin/common';
export * from './constants';
interface BaseParamsPNG {
    layout: LayoutParams;
    forceNow?: string;
    relativeUrl: string;
}
export type JobParamsPNGDeprecated = BaseParamsPNG & BaseParams;
export type TaskPayloadPNG = BaseParamsPNG & BasePayload;
export interface JobParamsPNGV2 extends BaseParams {
    layout: LayoutParams;
    /**
     * This value is used to re-create the same visual state as when the report was requested as well as navigate to the correct page.
     */
    locatorParams: LocatorParams;
}
export interface TaskPayloadPNGV2 extends BasePayload {
    layout: LayoutParams;
    forceNow: string;
    /**
     * Even though we only ever handle one locator for a PNG, we store it as an array for consistency with how PDFs are stored
     */
    locatorParams: LocatorParams[];
}
