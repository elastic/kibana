import type { ISuggestionItem } from '../../../../commands/registry/types';
import type { SortingContext } from './types';
export declare class SuggestionOrderingEngine {
    /**
     * Sorts suggestions based on their inferred category and context.
     * Lower priority number = appears first in list.
     */
    sort(suggestions: ISuggestionItem[], context: SortingContext): ISuggestionItem[];
}
