type LabelValue = string | number | boolean | null | undefined;
export interface ReportEsqlErrorOptions {
    errorType: string;
    labels?: Record<string, LabelValue>;
}
export declare const reportEsqlError: (error: unknown, { errorType, labels }: ReportEsqlErrorOptions) => void;
export {};
