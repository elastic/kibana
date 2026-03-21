import type { MatchedItem } from '@kbn/data-views-plugin/public';
/**
 This utility is designed to do a couple of things:

 1) Take in list of indices and filter out system indices if necessary
 2) Return a `visible` list based on a priority order.

 We are passing in three separate lists because they each represent
 something slightly different.

 - `unfilteredAllIndices`
    This is the result of the initial `*` query and represents all known indices
 - `unfilteredPartialMatchedIndices`
    This is the result of searching against the query with an added `*`. This is only
    used when the query does not end in an `*` and represents potential matches in the UI
 - `unfilteredExactMatchedIndices
    This is the result of searching against a query that already ends in `*`.
    We call this `exact` matches because ES is telling us exactly what it matches
 */
import type { MatchedIndicesSet } from '../types';
export declare function getMatchedIndices(unfilteredAllIndices: MatchedItem[], unfilteredPartialMatchedIndices: MatchedItem[], unfilteredExactMatchedIndices: MatchedItem[], isIncludingSystemIndices?: boolean): MatchedIndicesSet;
