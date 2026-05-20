import type { ReportingAPIClient } from '@kbn/reporting-public/reporting_api_client';
interface I18nStrings {
    displayName: string;
    toasts: {
        error: {
            title: string;
            body: string;
        };
        success: {
            title: string;
            body: JSX.Element;
        };
    };
}
export declare const getI18nStrings: (apiClient: ReportingAPIClient) => Record<"generate", I18nStrings>;
export {};
