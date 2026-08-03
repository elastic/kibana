import type { SerializedTimeRange, SerializedTitles } from '@kbn/presentation-publishing';
import type { VisParams } from '@kbn/visualizations-common';
import type { SerializedDrilldowns } from '@kbn/embeddable-plugin/server';
import type { SerializedVis } from '../types';
export type VisualizeEmbeddableBaseState = SerializedTitles & SerializedTimeRange & SerializedDrilldowns;
export type VisualizeByReferenceState = VisualizeEmbeddableBaseState & {
    savedObjectId?: string;
    uiState?: any;
};
export type VisualizeByValueState = VisualizeEmbeddableBaseState & {
    savedVis: SerializedVis<VisParams>;
};
export type VisualizeEmbeddableState = VisualizeByReferenceState | VisualizeByValueState;
