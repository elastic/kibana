import type { LayoutDirection, MetricStyle, SecondaryMetricProps } from '@elastic/charts';
import type { CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import type { KbnPaletteId } from '@kbn/palettes';
import type { OptionalKeys } from 'utility-types';
import type { CollapseFunction, LensLayerType } from '../types';
export type ValueFontMode = Exclude<MetricStyle['valueFontSize'], number>;
export type PrimaryMetricFontSize = ValueFontMode;
export type PrimaryMetricPosition = MetricStyle['valuePosition'];
export type MetricStyleTemplateId = 'top' | 'middle' | 'bottom' | 'custom';
export type MetricStyleTemplatePresetId = Exclude<MetricStyleTemplateId, 'custom'>;
export type SecondaryTrendType = 'none' | 'static' | 'dynamic';
export type SecondaryTrend = {
    type: 'none';
} | {
    type: 'static';
    color: string;
} | {
    type: 'dynamic';
    visuals: 'icon' | 'value' | 'both';
    paletteId: KbnPaletteId;
    reversed: boolean;
    baselineValue: number | 'primary';
};
export interface MetricVisualizationState {
    layerId: string;
    layerType: LensLayerType;
    metricAccessor?: string;
    secondaryMetricAccessor?: string;
    maxAccessor?: string;
    breakdownByAccessor?: string;
    collapseFn?: CollapseFunction;
    subtitle?: string;
    /**
     * legacy state property
     * @deprecated
     */
    secondaryPrefix?: string;
    secondaryLabel?: string;
    secondaryTrend?: SecondaryTrend;
    progressDirection?: LayoutDirection;
    showBar?: boolean;
    titlesTextAlign?: MetricStyle['titlesTextAlign'];
    /**
     * legacy state property
     * @deprecated
     */
    valuesTextAlign?: MetricStyle['valueTextAlign'];
    secondaryAlign?: MetricStyle['extraTextAlign'];
    primaryAlign?: MetricStyle['valueTextAlign'];
    iconAlign?: MetricStyle['iconAlign'];
    valueFontMode?: ValueFontMode;
    /**
     * legacy state property
     * @deprecated
     */
    titleWeight?: Extract<MetricStyle['titleWeight'], string>;
    primaryPosition?: PrimaryMetricPosition;
    secondaryLabelPosition?: SecondaryMetricProps['labelPosition'];
    color?: string;
    icon?: string;
    palette?: PaletteOutput<CustomPaletteParams>;
    maxCols?: number;
    trendlineLayerId?: string;
    trendlineLayerType?: LensLayerType;
    trendlineTimeAccessor?: string;
    trendlineMetricAccessor?: string;
    trendlineSecondaryMetricAccessor?: string;
    trendlineBreakdownByAccessor?: string;
    applyColorTo?: 'background' | 'value';
}
export type MetricVisualizationStateOptionals = Pick<MetricVisualizationState, OptionalKeys<MetricVisualizationState>>;
export type MetricStateOptinalsWithDefault = Pick<MetricVisualizationStateOptionals, 'titlesTextAlign' | 'primaryAlign' | 'secondaryAlign' | 'iconAlign' | 'valueFontMode' | 'primaryPosition' | 'secondaryLabelPosition' | 'applyColorTo'>;
export type MetricStateDefaults = Required<MetricStateOptinalsWithDefault>;
export type MetricLayoutWithDefault = Required<Pick<MetricStateOptinalsWithDefault, 'titlesTextAlign' | 'primaryAlign' | 'primaryPosition'>> & {
    secondaryAlign?: MetricStateOptinalsWithDefault['secondaryAlign'];
};
export type IconPosition = MetricStyle['iconAlign'];
export type Alignment = 'left' | 'center' | 'right';
