import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { ManualRangeEventAnnotationArgs, ManualRangeEventAnnotationOutput, ManualPointEventAnnotationArgs, ManualPointEventAnnotationOutput } from './types';
export declare const manualPointEventAnnotation: ExpressionFunctionDefinition<'manual_point_event_annotation', null, ManualPointEventAnnotationArgs, ManualPointEventAnnotationOutput>;
export declare const manualRangeEventAnnotation: ExpressionFunctionDefinition<'manual_range_event_annotation', null, ManualRangeEventAnnotationArgs, ManualRangeEventAnnotationOutput>;
