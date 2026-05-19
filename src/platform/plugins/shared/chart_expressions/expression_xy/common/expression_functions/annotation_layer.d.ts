import type { Datatable, ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { ANNOTATION_LAYER } from '../constants';
import type { AnnotationLayerArgs, AnnotationLayerConfigResult } from '../types';
export declare function annotationLayerFunction(): ExpressionFunctionDefinition<typeof ANNOTATION_LAYER, Datatable, AnnotationLayerArgs, AnnotationLayerConfigResult>;
