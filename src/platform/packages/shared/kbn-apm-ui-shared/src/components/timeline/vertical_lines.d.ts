import React from 'react';
import type { PlotValues } from './plot_utils';
import type { Mark } from './marker';
interface VerticalLinesProps {
    marks?: Mark[];
    plotValues: PlotValues;
    topTraceDuration: number;
}
export declare function VerticalLines({ topTraceDuration, plotValues, marks }: VerticalLinesProps): React.JSX.Element;
export {};
