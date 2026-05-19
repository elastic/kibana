import React from 'react';
import type { LineStyle } from '../types';
interface LineStyleConfig {
    lineStyle?: LineStyle;
    lineWidth?: number;
}
export declare const LineStyleSettings: ({ currentConfig, setConfig, idPrefix, }: {
    currentConfig?: LineStyleConfig;
    setConfig: (config: LineStyleConfig) => void;
    idPrefix: string;
}) => React.JSX.Element;
export {};
