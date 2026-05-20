import type { Reference } from '@kbn/content-management-utils';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import type { VisualizeEmbeddableState } from '../types';
import type { StoredVisualizeEmbeddableState } from './types';
export declare const VIS_SAVED_OBJECT_REF_NAME = "savedObjectRef";
export declare function getTransformIn(transformDrilldownsIn: DrilldownTransforms['transformIn']): (state: VisualizeEmbeddableState) => {
    state: StoredVisualizeEmbeddableState;
    references: Reference[];
};
