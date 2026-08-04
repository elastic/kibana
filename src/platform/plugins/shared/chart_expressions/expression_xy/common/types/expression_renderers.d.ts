import type { CustomAnnotationTooltip } from '@elastic/charts';
import type { AllowedChartOverrides, AllowedSettingsOverrides } from '@kbn/charts-plugin/common';
import type { ManualPointEventAnnotationArgs } from '@kbn/event-annotation-plugin/common';
import type { AvailableAnnotationIcon } from '@kbn/event-annotation-common';
import type { XY_VIS_RENDERER } from '../constants';
import type { AllowedXYOverrides, XYProps } from './expression_functions';
export interface XYChartProps {
    args: XYProps;
    syncTooltips: boolean;
    syncCursor: boolean;
    syncColors: boolean;
    canNavigateToLens?: boolean;
    overrides?: AllowedXYOverrides & AllowedSettingsOverrides & AllowedChartOverrides;
}
export interface XYRender {
    type: 'render';
    as: typeof XY_VIS_RENDERER;
    value: XYChartProps;
}
export interface MergedAnnotation extends Omit<ManualPointEventAnnotationArgs, 'icon'> {
    timebucket: number;
    position: 'bottom';
    icon?: AvailableAnnotationIcon | string;
    customTooltip: CustomAnnotationTooltip;
    isGrouped: boolean;
}
