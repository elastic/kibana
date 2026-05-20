import type { SavedObjectReference } from '@kbn/core/server';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import type { SearchEmbeddablePanelApiState, StoredSearchEmbeddableState } from './types';
export declare function getTransformIn(transformDrilldownsIn: DrilldownTransforms['transformIn']): (apiState: SearchEmbeddablePanelApiState) => {
    state: StoredSearchEmbeddableState;
    references: SavedObjectReference[];
};
