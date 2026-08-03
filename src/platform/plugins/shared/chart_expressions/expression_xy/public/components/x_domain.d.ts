import React from 'react';
import type { DatatableUtilitiesService } from '@kbn/data-plugin/common';
import type { AxisExtentConfigResult, CommonXYDataLayerConfig } from '../../common';
export interface XDomain {
    min?: number;
    max?: number;
    minInterval?: number;
}
export declare const getXDomain: (datatableUtilitites: DatatableUtilitiesService, layers: CommonXYDataLayerConfig[], minInterval: number | undefined, isTimeVis: boolean, isHistogram: boolean, hasBars: boolean, timeZone: string, xExtent?: AxisExtentConfigResult) => {
    baseDomain: {
        minInterval: number | undefined;
        min: number;
        max: number;
    } | undefined;
    extendedDomain: {
        minInterval: number | undefined;
        min: number;
        max: number;
    } | undefined;
};
export declare const XyEndzones: ({ baseDomain, extendedDomain, histogramMode, darkMode, }: {
    baseDomain?: XDomain;
    extendedDomain?: XDomain;
    histogramMode: boolean;
    darkMode: boolean;
}) => React.JSX.Element | null;
