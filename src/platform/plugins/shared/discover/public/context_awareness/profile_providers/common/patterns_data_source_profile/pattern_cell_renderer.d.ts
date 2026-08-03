import React from 'react';
import type { FC } from 'react';
interface Props {
    pattern: string;
    isDetails: boolean;
    defaultRowHeight?: number;
}
export declare const PatternCellRenderer: FC<Props>;
export declare function getPatternCellRenderer(pattern: unknown, isDetails: boolean, defaultRowHeight?: number): "-" | React.JSX.Element;
export {};
