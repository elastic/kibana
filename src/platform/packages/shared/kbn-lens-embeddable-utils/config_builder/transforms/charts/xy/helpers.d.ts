import type { XYDataLayerConfig, XYLayerConfig, XYPersistedLayerConfig } from '@kbn/lens-common';
import type { AvailableAnnotationIcon } from '@kbn/event-annotation-common';
import type { AnnotationLayerType, DataLayerType, LayerTypeESQL, ReferenceLineLayerType, XYLayer } from '../../../schema/charts/xy';
export declare function getAccessorNameForXY(layer: XYLayer, accessorType: 'x' | 'y' | 'y_ref' | 'breakdown' | 'threshold' | 'event', index?: number): string;
export declare function getIdForLayer(layer: XYLayer, i: number): string;
export declare function isAPIAnnotationLayer(layer: XYLayer): layer is AnnotationLayerType;
export declare function isAPIReferenceLineLayer(layer: XYLayer): layer is ReferenceLineLayerType;
export declare function isAPIDataLayer(layer: XYLayer): layer is DataLayerType;
export declare function isAPIXYLayer(layer: unknown): layer is XYLayer;
export declare function isAPIesqlXYLayer(layer: XYLayer): layer is LayerTypeESQL;
export declare function isLensStateDataLayer(layer: XYLayerConfig | XYPersistedLayerConfig): layer is XYDataLayerConfig;
type XYApiIconName = NonNullable<ReferenceLineLayerType['thresholds'][number]['icon']>;
export declare const xyIconCompat: {
    toState: {
        (value: XYApiIconName): AvailableAnnotationIcon;
        (value?: XYApiIconName | undefined): AvailableAnnotationIcon | undefined;
    };
    toAPI: {
        (value: AvailableAnnotationIcon): XYApiIconName;
        (value?: AvailableAnnotationIcon | undefined): XYApiIconName | undefined;
    };
};
export {};
