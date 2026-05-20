import { SortDirection } from '@kbn/data-plugin/public';
import { SurrDocType } from '../services/context';
export type IntervalValue = number | null;
/**
 * Generate a sequence of pairs from the iterable that looks like
 * `[[x_0, x_1], [x_1, x_2], [x_2, x_3], ..., [x_(n-1), x_n]]`.
 */
export declare function asPairs(iterable: Iterable<IntervalValue>): IterableIterator<IntervalValue[]>;
/**
 * Returns a iterable containing intervals `[start,end]` for Elasticsearch date range queries
 * depending on type (`successors` or `predecessors`) and sort (`asc`, `desc`) these are ascending or descending intervals.
 */
export declare function generateIntervals(offsets: number[], startTime: number, type: SurrDocType, sort: SortDirection): IterableIterator<IntervalValue[]>;
