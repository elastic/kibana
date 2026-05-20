import type { CommonXYLayerConfig, CommonXYDataLayerConfig, CommonXYReferenceLineLayerConfig, CommonXYAnnotationLayerConfig, ReferenceLineLayerConfig, ReferenceLineConfig, ReferenceLineDecorationConfigResult, ExtendedReferenceLineDecorationConfig } from '../../common/types';
export declare const isDataLayer: (layer: CommonXYLayerConfig) => layer is CommonXYDataLayerConfig;
export declare const getDataLayers: (layers: CommonXYLayerConfig[]) => CommonXYDataLayerConfig[];
export declare const isReferenceLayer: (layer: CommonXYLayerConfig) => layer is ReferenceLineLayerConfig;
export declare const isReferenceLine: (layer: CommonXYLayerConfig) => layer is ReferenceLineConfig;
export declare const isReferenceLineDecorationConfig: (decoration: ExtendedReferenceLineDecorationConfig | ReferenceLineDecorationConfigResult) => decoration is ExtendedReferenceLineDecorationConfig;
export declare const isReferenceLineOrLayer: (layer: CommonXYLayerConfig) => layer is CommonXYReferenceLineLayerConfig;
export declare const getReferenceLayers: (layers: CommonXYLayerConfig[]) => CommonXYReferenceLineLayerConfig[];
export declare const isAnnotationsLayer: (layer: CommonXYLayerConfig) => layer is CommonXYAnnotationLayerConfig;
