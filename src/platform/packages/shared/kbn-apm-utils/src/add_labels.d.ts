import type { AttributeValue } from '@opentelemetry/api';
export type Labels = Record<string, string | number | boolean | null | undefined>;
interface AddLabelsOptions {
    otelAttributes?: Record<string, AttributeValue>;
    isString?: boolean;
}
export declare const prefixKeys: (labels: Labels, prefix: string) => Record<string, AttributeValue>;
export declare const addSpanLabels: (labels: Labels, opts?: AddLabelsOptions) => void;
export declare const addTransactionLabels: (labels: Labels, opts?: AddLabelsOptions) => void;
export {};
