import type { PaletteOutput } from '@kbn/coloring';
import type { Datatable, DefaultInspectorAdapters, ExecutionContext, ExpressionFunctionDefinition, ExpressionValueRender, Style } from '@kbn/expressions-plugin/common';
import type { ExpressionValueVisDimension } from '@kbn/chart-expressions-common';
import type { ColorMode, CustomPaletteState } from '@kbn/charts-plugin/common';
import type { VisParams, visType, LabelPositionType, MetricAlignment } from './expression_renderers';
import type { EXPRESSION_METRIC_NAME } from '../constants';
export interface MetricArguments {
    autoScaleMetricAlignment?: MetricAlignment;
    percentageMode: boolean;
    colorMode: ColorMode;
    showLabels: boolean;
    palette?: PaletteOutput<CustomPaletteState>;
    font: Style;
    labelFont: Style;
    labelPosition: LabelPositionType;
    metric: Array<ExpressionValueVisDimension | string>;
    bucket?: ExpressionValueVisDimension | string;
    colorFullBackground: boolean;
    autoScale?: boolean;
}
export type MetricInput = Datatable;
export interface MetricVisRenderConfig {
    visType: typeof visType;
    visData: Datatable;
    visConfig: Pick<VisParams, 'metric' | 'dimensions'>;
    canNavigateToLens: boolean;
}
export type MetricVisExpressionFunctionDefinition = ExpressionFunctionDefinition<typeof EXPRESSION_METRIC_NAME, MetricInput, MetricArguments, ExpressionValueRender<MetricVisRenderConfig>, ExecutionContext<DefaultInspectorAdapters>>;
