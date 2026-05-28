/**
 * ui_counters query v1
 * @remarks
 */
export interface UiCountersRequestBody {
    report: {
        reportVersion?: 3;
        userAgent?: Record<string, Readonly<{} & {
            key: string;
            type: string;
            appName: string;
            userAgent: string;
        }>>;
        uiCounter?: Record<string, Readonly<{} & {
            key: string;
            type: string;
            appName: string;
            eventName: string;
            total: number;
        }>>;
        application_usage?: Record<string, Readonly<{
            minutesOnScreen: number;
            numberOfClicks: number;
            appId: string;
            viewId: string;
        }>>;
    };
}
/** explicit response type for store report success. The status value is hardcoded. */
export interface UiCountersResponseOk {
    status: 'ok';
}
/** explicit response type for store report fail. The status value is hardcoded. */
export interface UiCountersResponseFail {
    status: 'fail';
}
