import React from 'react';
import type { MetricOptions, MetricStyle, MetricVisParam } from '../../common/types';
interface MetricVisValueProps {
    metric: MetricOptions;
    onFilter?: () => void;
    style: MetricStyle;
    labelConfig: MetricVisParam['labels'];
    colorFullBackground: boolean;
    autoScale?: boolean;
    renderComplete?: () => void;
}
export declare const MetricVisValue: (props: MetricVisValueProps) => React.JSX.Element;
export {};
