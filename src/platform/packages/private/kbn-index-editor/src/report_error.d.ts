type LabelValue = string | number | boolean | null | undefined;
export interface ReportIndexEditorErrorOptions {
    errorType: string;
    labels?: Record<string, LabelValue>;
}
export declare const reportIndexEditorError: (error: unknown, { errorType, labels }: ReportIndexEditorErrorOptions) => void;
export {};
