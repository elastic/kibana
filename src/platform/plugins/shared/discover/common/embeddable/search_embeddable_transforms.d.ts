import type { DrilldownTransforms, EmbeddableTransforms } from '@kbn/embeddable-plugin/common';
import type { SearchEmbeddablePanelApiState, StoredSearchEmbeddableState } from './types';
export type { SearchEmbeddablePanelApiState } from './types';
export declare function getSearchEmbeddableTransforms(drilldownTransforms: DrilldownTransforms, isEmbeddableTransformsEnabled: () => boolean): EmbeddableTransforms<StoredSearchEmbeddableState, SearchEmbeddablePanelApiState>;
