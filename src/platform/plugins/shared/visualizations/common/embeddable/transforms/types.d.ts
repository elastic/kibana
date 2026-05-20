import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import type { SerializedVis, SerializedVisData } from '../../types';
import type { VisualizeByReferenceState, VisualizeEmbeddableBaseState } from '../types';
export type StoredVisualizeByReferenceState = VisualizeEmbeddableBaseState & Omit<VisualizeByReferenceState, 'savedObjectId'>;
export type StoredVis = Omit<SerializedVis, 'data'> & {
    data: Omit<SerializedVisData, 'searchSource'> & {
        savedSearchRefName?: string;
        searchSource: SerializedSearchSourceFields & {
            indexRefName?: string;
        };
    };
};
export type StoredVisualizeByValueState = VisualizeEmbeddableBaseState & {
    savedVis: StoredVis;
};
export type StoredVisualizeEmbeddableState = StoredVisualizeByReferenceState | StoredVisualizeByValueState;
