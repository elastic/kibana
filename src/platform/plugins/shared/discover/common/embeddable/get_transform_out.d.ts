import type { SavedObjectReference } from '@kbn/core/server';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import type { SearchEmbeddablePanelApiState, StoredSearchEmbeddableState } from './types';
export declare function getTransformOut(transformDrilldownsOut: DrilldownTransforms['transformOut'], isEmbeddableTransformsEnabled: () => boolean): (storedState: StoredSearchEmbeddableState, references?: SavedObjectReference[]) => SearchEmbeddablePanelApiState;
