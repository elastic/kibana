import type { DocumentDiffMode } from '../types';
export interface CalculateDiffProps {
    diffMode: Exclude<DocumentDiffMode, 'basic'>;
    baseValue: unknown;
    comparisonValue: unknown;
}
export declare const calculateDiff: ({ diffMode, baseValue, comparisonValue }: CalculateDiffProps) => import("diff").ChangeObject<string>[];
export declare const formatDiffValue: (value: unknown, forceJson: boolean) => {
    value: string;
    isJson: boolean;
};
