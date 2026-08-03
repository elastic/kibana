import type { Margins } from '.';
export type PlotValues = ReturnType<typeof getPlotValues>;
export declare function getPlotValues({ width, xMin, xMax, margins, numberOfTicks, }: {
    width: number;
    xMin?: number;
    xMax: number;
    margins: Margins;
    numberOfTicks?: number;
}): {
    margins: Margins;
    tickValues: number[];
    width: number;
    xDomain: number[];
    xMax: number;
    xScale: import("d3-scale").ScaleLinear<number, number, never>;
};
