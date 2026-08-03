import React from 'react';
import type { Mark } from '.';
import type { PlotValues } from './plot_utils';
interface TimelineAxisProps {
    plotValues: PlotValues;
    marks?: Mark[];
    topTraceDuration: number;
}
export declare function TimelineAxis({ plotValues, marks, topTraceDuration }: TimelineAxisProps): React.JSX.Element;
export {};
