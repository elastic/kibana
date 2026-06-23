import { type ESQLControlVariable } from '@kbn/esql-types';
import type { ISuggestionItem } from '../../../../../registry/types';
import type { PromqlDetailedPosition } from '../types';
/** Suggests selector/range/operator tokens after a metric name. */
export declare const suggestMetrics: (position: PromqlDetailedPosition) => ISuggestionItem[];
/** Suggests the next token after a closed label selector. */
export declare const suggestAfterLabelSelector: (position: PromqlDetailedPosition) => ISuggestionItem[];
/** Suggests label matcher operators after a label name. */
export declare const suggestLabelMatchers: () => ISuggestionItem[];
/** Suggests placeholder values and control variables after a label matcher operator. */
export declare const suggestLabelValues: (variables?: ESQLControlVariable[], supportsControls?: boolean) => ISuggestionItem[];
/** Suggests PromQL duration snippets for range selector contexts. */
export declare const suggestTimeDurations: () => ISuggestionItem[];
