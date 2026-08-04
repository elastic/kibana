import React, { Component } from 'react';
import type { Datatable } from '@kbn/expressions-plugin/public';
import type { VisParams } from '../../common/types';
export interface MetricVisComponentProps {
    visParams: Pick<VisParams, 'metric' | 'dimensions'>;
    visData: Datatable;
    filterable: boolean[];
    fireEvent: (event: any) => void;
    renderComplete: () => void;
}
declare class MetricVisComponent extends Component<MetricVisComponentProps> {
    private getColor;
    private processTableGroups;
    private filterColumn;
    private isAutoScaleWithColorizingContainer;
    private renderMetric;
    render(): React.JSX.Element[] | undefined;
}
export { MetricVisComponent as default };
