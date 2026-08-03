import React from 'react';
import type { AllowedChartOverrides, AllowedSettingsOverrides } from '@kbn/charts-plugin/common';
import type { Datatable, IInterpreterRenderHandlers } from '@kbn/expressions-plugin/common';
import type { VisParams } from '../../common';
export interface MetricVisComponentProps {
    data: Datatable;
    config: Pick<VisParams, 'metric' | 'dimensions'>;
    renderComplete: IInterpreterRenderHandlers['done'];
    fireEvent: IInterpreterRenderHandlers['event'];
    filterable: boolean;
    overrides?: AllowedSettingsOverrides & AllowedChartOverrides;
}
export declare const MetricVis: ({ data, config, renderComplete, fireEvent, filterable, overrides, }: MetricVisComponentProps) => React.JSX.Element;
