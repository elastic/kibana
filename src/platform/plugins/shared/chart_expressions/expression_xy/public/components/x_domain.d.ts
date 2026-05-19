import React from 'react';
import type { DatatableUtilitiesService } from '@kbn/data-plugin/common';
import type { AxisExtentConfigResult, CommonXYDataLayerConfig } from '../../common';
export interface XDomain {
    min?: number;
    max?: number;
    minInterval?: number;
}
export declare const getAppliedTimeRange: (datatableUtilitites: DatatableUtilitiesService, layers: CommonXYDataLayerConfig[]) => {
    timeRange: import("@kbn/data-plugin/common").TimeRange;
    field: string | undefined;
} | undefined;
export declare const getXDomain: (datatableUtilitites: DatatableUtilitiesService, layers: CommonXYDataLayerConfig[], minInterval: number | undefined, isTimeViz: boolean, isHistogram: boolean, hasBars: boolean, timeZone: string, xExtent?: AxisExtentConfigResult) => {
    baseDomain: {
        min: number;
        max: number;
        minInterval: number | undefined;
    } | undefined;
    extendedDomain: {
        min: number;
        max: number;
        minInterval: number | undefined;
    } | undefined;
};
export declare const XyEndzones: ({ baseDomain, extendedDomain, histogramMode, darkMode, }: {
    baseDomain?: XDomain;
    extendedDomain?: XDomain;
    histogramMode: boolean;
    darkMode: boolean;
}) => React.JSX.Element | null;
