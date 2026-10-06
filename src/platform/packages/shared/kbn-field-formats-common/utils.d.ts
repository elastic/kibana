import { MISSING_TOKEN } from './constants';
/**
 * True when a value carries no data: an absent field, an explicit null, or the sentinel
 * Elasticsearch aggregations use for a missing bucket. These are the values rendered as
 * NULL_PLACEHOLDER in tables and Discover and as NULL_LABEL everywhere else.
 * Narrows the argument so later code can treat the value as present.
 */
export declare const isMissingValue: (value: unknown) => value is null | undefined | typeof MISSING_TOKEN;
export declare function getEmptyOrMissingLabel(val: unknown): string | undefined;
