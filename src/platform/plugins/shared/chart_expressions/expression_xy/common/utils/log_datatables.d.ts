import type { Datatable, DefaultInspectorAdapters, ExecutionContext } from '@kbn/expressions-plugin/common';
import type { ExpressionValueVisDimension } from '@kbn/chart-expressions-common';
import type { LayerDimension } from '@kbn/visualizations-common';
import type { CommonXYDataLayerConfig, CommonXYLayerConfig, ExpressionAnnotationResult, ReferenceLineLayerConfig } from '../types';
export declare const logDatatables: (layers: CommonXYLayerConfig[], handlers: ExecutionContext<DefaultInspectorAdapters>, splitColumnAccessor?: string | ExpressionValueVisDimension, splitRowAccessor?: string | ExpressionValueVisDimension, annotations?: ExpressionAnnotationResult) => void;
export declare const logDatatable: (data: Datatable, layers: CommonXYLayerConfig[], handlers: ExecutionContext<DefaultInspectorAdapters>, splitColumnAccessor?: string | ExpressionValueVisDimension, splitRowAccessor?: string | ExpressionValueVisDimension) => void;
export declare const getLayerDimensions: (layer: CommonXYDataLayerConfig | ReferenceLineLayerConfig) => LayerDimension[];
