import type { SavedObjectReference } from '@kbn/core/server';
import type { FormBasedLayer, TextBasedLayer, XYAnnotationLayerConfig, XYDataLayerConfig, XYPersistedAnnotationLayerConfig, XYReferenceLineLayerConfig } from '@kbn/lens-common';
import type { AnnotationLayerType, DataLayerType, ReferenceLineLayerTypeESQL, ReferenceLineLayerTypeNoESQL } from '../../../schema/charts/xy';
import { type ResolveAxisId } from './chart';
export declare function buildAPIDataLayer(visualization: XYDataLayerConfig, layer: Omit<FormBasedLayer, 'indexPatternId'> | TextBasedLayer, adHocDataViews: Record<string, unknown>, references: SavedObjectReference[], adhocReferences: SavedObjectReference[] | undefined, resolveAxisId: ResolveAxisId): DataLayerType;
export declare function buildAPIReferenceLinesLayer(visualization: XYReferenceLineLayerConfig, layer: Omit<FormBasedLayer, 'indexPatternId'>, adHocDataViews: Record<string, unknown>, resolveAxisId: ResolveAxisId, references: SavedObjectReference[], adhocReferences?: SavedObjectReference[]): ReferenceLineLayerTypeNoESQL;
/**
 * @deprecated ES|QL reference lines are not yet supported
 */
export declare function buildAPIReferenceLinesLayer(visualization: XYReferenceLineLayerConfig, layer: TextBasedLayer, adHocDataViews: Record<string, unknown>, resolveAxisId: ResolveAxisId, references: SavedObjectReference[], adhocReferences?: SavedObjectReference[]): ReferenceLineLayerTypeESQL;
export declare function buildAPIAnnotationsLayer(layer: XYPersistedAnnotationLayerConfig | XYAnnotationLayerConfig, adHocDataViews: Record<string, unknown>, references: SavedObjectReference[], adhocReferences?: SavedObjectReference[]): AnnotationLayerType;
