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
        userAgent: string;
        type: string;
        key: string;
        appName: string;
    }>> | undefined>;
    uiCounter: import("@kbn/config-schema").Type<Record<string, Readonly<{
        namespace?: string | undefined;
    } & {
        total: number;
        type: string;
        key: string;
        appName: string;
        eventName: string;
    }>> | undefined>;
    application_usage: import("@kbn/config-schema").Type<Record<string, Readonly<{} & {
        appId: string;
        viewId: string;
        numberOfClicks: number;
        minutesOnScreen: number;
    }>> | undefined>;
}>;
export type ReportSchemaType = TypeOf<typeof reportSchema>;
export type ApplicationUsageReport = TypeOf<typeof applicationUsageReportSchema>;
export {};
