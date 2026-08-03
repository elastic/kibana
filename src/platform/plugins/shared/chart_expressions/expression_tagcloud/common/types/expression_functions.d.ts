import type { $Values } from '@kbn/utility-types';
import type { PaletteOutput } from '@kbn/coloring';
import type { Datatable, ExpressionFunctionDefinition, ExpressionValueRender } from '@kbn/expressions-plugin/common';
import type { ExpressionValueVisDimension } from '@kbn/chart-expressions-common';
import type { AllowedSettingsOverrides, AllowedChartOverrides } from '@kbn/charts-plugin/common';
import type { EXPRESSION_NAME, ScaleOptions, Orientation } from '../constants';
interface TagCloudCommonParams {
    scale?: $Values<typeof ScaleOptions>;
    orientation: $Values<typeof Orientation>;
    minFontSize: number;
    maxFontSize: number;
    showLabel: boolean;
    ariaLabel?: string;
    metric: ExpressionValueVisDimension | string;
    bucket?: ExpressionValueVisDimension | string;
    palette: PaletteOutput;
    colorMapping?: string;
}
export interface TagCloudVisConfig extends TagCloudCommonParams {
    isPreview?: boolean;
}
export interface TagCloudRendererParams extends TagCloudCommonParams {
    isPreview: boolean;
}
export interface TagcloudRendererConfig {
    visType: typeof EXPRESSION_NAME;
    visData: Datatable;
    visParams: TagCloudRendererParams;
    syncColors: boolean;
    overrides?: AllowedSettingsOverrides & AllowedChartOverrides;
}
export type ExpressionTagcloudFunctionDefinition = ExpressionFunctionDefinition<typeof EXPRESSION_NAME, Datatable, TagCloudVisConfig, ExpressionValueRender<TagcloudRendererConfig>>;
export type ExpressionTagcloudFunction = () => ExpressionTagcloudFunctionDefinition;
export {};
