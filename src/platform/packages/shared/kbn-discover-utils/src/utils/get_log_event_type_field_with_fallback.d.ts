import type { LogDocumentOverview } from '../types';
export declare const getLogEventTypeFieldWithFallback: (doc: LogDocumentOverview) => {
    field: string;
    value: string;
    formattedValue: string | undefined;
    originalValue: unknown;
} | {
    field: undefined;
    value?: undefined;
    formattedValue?: undefined;
    originalValue?: undefined;
};
