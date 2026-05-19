import type { GaugeArguments as GaugeExpressionArgs, GaugeColorMode } from '@kbn/expression-gauge-plugin/common';
import type { CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import type { LensLayerType } from '../types';
export type GaugeAccessors = Pick<GaugeExpressionArgs, 'metric' | 'goal' | 'min' | 'max'>;
export type GaugeVisualizationState = Omit<GaugeExpressionArgs, 'metric' | 'goal' | 'min' | 'max' | 'palette' | 'colorMode'> & {
    metricAccessor?: string;
    minAccessor?: string;
    maxAccessor?: string;
    goalAccessor?: string;
    layerId: string;
    layerType: LensLayerType;
    palette?: PaletteOutput<CustomPaletteParams>;
    colorMode?: GaugeColorMode;
};
