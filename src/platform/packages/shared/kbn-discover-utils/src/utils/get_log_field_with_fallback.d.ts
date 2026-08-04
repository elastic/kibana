import type { LogDocumentOverview } from '../types';
export declare const getLogFieldWithFallback: <T extends keyof LogDocumentOverview>(doc: Record<string, unknown> | LogDocumentOverview, rankingOrder: readonly T[], options?: {
    includeFormattedValue?: boolean;
    includeOriginalValue?: boolean;
}) => {
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
