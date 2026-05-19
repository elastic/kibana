import React from 'react';
export declare const RowHeightMode: {
    readonly auto: "auto";
    readonly custom: "custom";
};
export type RowHeightModeType = keyof typeof RowHeightMode;
export interface RowHeightSettingsProps {
    lineCountInput: number | undefined;
    rowHeight?: RowHeightModeType;
    maxRowHeight?: number;
    label: string;
    onChangeRowHeight: (newHeightMode: RowHeightModeType | undefined) => void;
    onChangeLineCountInput: (newRowHeightLines: number, isValid: boolean) => void;
    'data-test-subj'?: string;
    fullWidth?: boolean;
}
export declare function RowHeightSettings({ lineCountInput, label, rowHeight, onChangeRowHeight, onChangeLineCountInput, maxRowHeight, ['data-test-subj']: dataTestSubj, fullWidth, }: RowHeightSettingsProps): React.JSX.Element;
