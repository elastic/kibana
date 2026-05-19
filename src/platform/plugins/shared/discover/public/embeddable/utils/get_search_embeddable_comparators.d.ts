import type { StateComparators } from '@kbn/presentation-publishing';
import type { EditableSavedSearchAttributes, SearchEmbeddableBaseState, SearchEmbeddableByReferenceState, SearchEmbeddableByValueState } from '../../../common/embeddable/types';
import type { DiscoverSessionEmbeddableByReferenceProps, DiscoverSessionEmbeddableByValueProps } from '../../../server';
type SearchEmbeddableStateAttrs = EditableSavedSearchAttributes & (Omit<SearchEmbeddableByValueState, keyof SearchEmbeddableBaseState> | Omit<SearchEmbeddableByReferenceState, keyof SearchEmbeddableBaseState>);
export declare function getSearchEmbeddableComparators(isByValue: boolean, shouldSkipTabComparators: boolean): StateComparators<SearchEmbeddableStateAttrs>;
export declare function getDiscoverSessionEmbeddableComparators(isByValue: boolean, shouldSkipTabComparators: boolean): StateComparators<DiscoverSessionEmbeddableByValueProps | DiscoverSessionEmbeddableByReferenceProps>;
export {};
