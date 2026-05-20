import React from 'react';
import type { Position } from '@elastic/charts';
export interface LegendToggleProps {
    onClick: () => void;
    showLegend: boolean;
    legendPosition: Position;
}
export declare const LegendToggle: React.MemoExoticComponent<({ onClick, showLegend, legendPosition }: LegendToggleProps) => React.JSX.Element>;
