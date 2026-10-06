import type { TypeOf } from '@kbn/config-schema';
declare const applicationUsageReportSchema: import("@kbn/config-schema").ObjectType<{
    minutesOnScreen: import("@kbn/config-schema").Type<number>;
    numberOfClicks: import("@kbn/config-schema").Type<number>;
    appId: import("@kbn/config-schema").Type<string>;
    viewId: import("@kbn/config-schema").Type<string>;
}>;
export declare const reportSchema: import("@kbn/config-schema").ObjectType<{
    reportVersion: import("@kbn/config-schema").Type<3 | undefined>;
    userAgent: import("@kbn/config-schema").Type<Record<string, Readonly<{} & {
        key: string;
        type: string;
        appName: string;
        userAgent: string;
    }>> | undefined>;
    uiCounter: import("@kbn/config-schema").Type<Record<string, Readonly<{
        namespace?: string | undefined;
    } & {
        key: string;
        type: string;
        appName: string;
        eventName: string;
        total: number;
    }>> | undefined>;
    application_usage: import("@kbn/config-schema").Type<Record<string, Readonly<{} & {
        minutesOnScreen: number;
        numberOfClicks: number;
        appId: string;
        viewId: string;
    }>> | undefined>;
}>;
export type ReportSchemaType = TypeOf<typeof reportSchema>;
export type ApplicationUsageReport = TypeOf<typeof applicationUsageReportSchema>;
export {};
