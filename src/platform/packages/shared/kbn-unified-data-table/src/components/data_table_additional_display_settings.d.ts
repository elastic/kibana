import React from 'react';
import type { RowHeightSettingsProps } from './row_height_settings';
export declare const DEFAULT_MAX_ALLOWED_SAMPLE_SIZE = 1000;
export declare const MIN_ALLOWED_SAMPLE_SIZE = 1;
export declare const RANGE_MIN_SAMPLE_SIZE = 10;
export declare const RANGE_STEP_SAMPLE_SIZE = 10;
export interface UnifiedDataTableAdditionalDisplaySettingsProps {
    rowHeight: RowHeightSettingsProps['rowHeight'];
    onChangeRowHeight?: (rowHeight: RowHeightSettingsProps['rowHeight']) => void;
    onChangeRowHeightLines?: (rowHeightLines: number, isValid: boolean) => void;
    headerRowHeight: RowHeightSettingsProps['rowHeight'];
    onChangeHeaderRowHeight?: (headerRowHeight: RowHeightSettingsProps['rowHeight']) => void;
    onChangeHeaderRowHeightLines?: (headerRowHeightLines: number, isValid: boolean) => void;
    maxAllowedSampleSize?: number;
    sampleSize: number;
    onChangeSampleSize?: (sampleSize: number) => void;
    lineCountInput: number | undefined;
    headerLineCountInput: number | undefined;
    densityControl?: React.ReactNode;
}
export declare const UnifiedDataTableAdditionalDisplaySettings: React.FC<UnifiedDataTableAdditionalDisplaySettingsProps>;
