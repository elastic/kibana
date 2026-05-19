import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { AxisExtentConfig, AxisExtentConfigResult } from '../types';
import { AXIS_EXTENT_CONFIG } from '../constants';
export declare const axisExtentConfigFunction: ExpressionFunctionDefinition<typeof AXIS_EXTENT_CONFIG, null, AxisExtentConfig, AxisExtentConfigResult>;
