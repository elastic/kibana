import React from 'react';
import type { AgentMark } from './marker/agent_marker';
import type { ErrorMark } from './marker/error_marker';
export type Mark = AgentMark | ErrorMark;
export interface Margins {
    top: number;
    right: number;
    bottom: number;
    left: number;
}
export interface TimelineProps {
    marks?: Mark[];
    xMin?: number;
    xMax?: number;
    margins: Margins;
    numberOfTicks?: number;
    height?: number;
}
export declare function TimelineAxisContainer({ xMax, xMin, margins, marks, numberOfTicks, }: TimelineProps): React.JSX.Element | null;
export declare function VerticalLinesContainer({ xMax, xMin, margins, marks, height }: TimelineProps): React.JSX.Element | null;
