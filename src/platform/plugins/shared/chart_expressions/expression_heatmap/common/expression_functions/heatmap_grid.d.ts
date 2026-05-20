import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { EXPRESSION_HEATMAP_GRID_NAME } from '../constants';
import type { HeatmapGridConfig, HeatmapGridConfigResult } from '../types';
export declare const heatmapGridConfig: ExpressionFunctionDefinition<typeof EXPRESSION_HEATMAP_GRID_NAME, null, HeatmapGridConfig, HeatmapGridConfigResult>;
