import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { CollapseFunction, NavigateToLensLayer, XYLayerConfig, XYByValueAnnotationLayerConfig } from '@kbn/lens-common';
import type { SupportedMetric } from './lib/convert/supported_metrics';
import type { Column } from './types';
export declare const isAnnotationsLayer: (layer: Pick<XYLayerConfig, "layerType">) => layer is XYByValueAnnotationLayerConfig;
export declare const getIndexPatternIds: (layers: NavigateToLensLayer[]) => string[];
export declare const isFieldValid: (visType: string, field: DataViewField | undefined, aggregation: SupportedMetric) => field is DataViewField;
export declare const isCollapseFunction: (candidate: string | undefined) => candidate is CollapseFunction;
export declare const excludeMetaFromColumn: (column: Column) => Column;
