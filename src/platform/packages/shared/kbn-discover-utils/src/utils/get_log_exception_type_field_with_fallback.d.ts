import type { LogDocumentOverview } from '../types';
export declare const getLogExceptionTypeFieldWithFallback: (doc: Record<string, unknown> | LogDocumentOverview) => {
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
