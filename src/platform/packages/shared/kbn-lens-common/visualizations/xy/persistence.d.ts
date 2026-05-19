import type { XYByValueAnnotationLayerConfig, XYDataLayerConfig, XYReferenceLineLayerConfig, XYVisualizationState } from './types';
/**
 * This is the type of hybrid layer we get after the user has made a change to
 * a by-reference annotation layer and saved the visualization without
 * first saving the changes to the library annotation layer.
 *
 * We maintain the link to the library annotation group, but allow the users
 * changes (persisted in the visualization state) to override the attributes in
 * the library version until the user
 * - saves the changes to the library annotation group
 * - reverts the changes
 * - unlinks the layer from the library annotation group
 */
export type XYPersistedLinkedByValueAnnotationLayerConfig = Omit<XYPersistedByValueAnnotationLayerConfig, 'persistanceType'> & Omit<XYPersistedByReferenceAnnotationLayerConfig, 'persistanceType'> & {
    persistanceType: 'linked';
};
export type XYPersistedByValueAnnotationLayerConfig = Omit<XYByValueAnnotationLayerConfig, 'indexPatternId' | 'hide' | 'simpleView'> & {
    persistanceType?: 'byValue';
    hide?: boolean;
    simpleView?: boolean;
};
export type XYPersistedByReferenceAnnotationLayerConfig = Pick<XYByValueAnnotationLayerConfig, 'layerId' | 'layerType'> & {
    persistanceType: 'byReference';
    annotationGroupRef: string;
};
export type XYPersistedAnnotationLayerConfig = XYPersistedByReferenceAnnotationLayerConfig | XYPersistedByValueAnnotationLayerConfig | XYPersistedLinkedByValueAnnotationLayerConfig;
export type XYPersistedLayerConfig = XYDataLayerConfig | XYReferenceLineLayerConfig | XYPersistedAnnotationLayerConfig;
export type XYPersistedState = Omit<XYVisualizationState, 'layers'> & {
    layers: XYPersistedLayerConfig[];
    valuesInLegend?: boolean;
};
export declare const isPersistedByReferenceAnnotationsLayer: (layer: XYPersistedAnnotationLayerConfig) => layer is XYPersistedByReferenceAnnotationLayerConfig;
export declare const isPersistedLinkedByValueAnnotationsLayer: (layer: XYPersistedAnnotationLayerConfig) => layer is XYPersistedLinkedByValueAnnotationLayerConfig;
export declare const isPersistedAnnotationsLayer: (layer: XYPersistedLayerConfig) => layer is XYPersistedAnnotationLayerConfig;
export declare const isPersistedByValueAnnotationsLayer: (layer: XYPersistedLayerConfig) => layer is XYPersistedByValueAnnotationLayerConfig;
