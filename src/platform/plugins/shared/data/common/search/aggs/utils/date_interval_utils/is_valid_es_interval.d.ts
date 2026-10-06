/**
 * Checks whether a given interval string (e.g. 1w, 24h, ...) is a valid Elasticsearch interval.
 * Will return false if the interval is not valid in Elasticsearch, otherwise true.
 * Invalid intervals might be: 2f, since there is no unit 'f'; 2w, since weeks and month intervals
 * are only allowed with a value of 1, etc.
 *
 * @param interval The interval string like 1w, 24h
 * @returns True if the interval is valid for Elasticsearch
 */
export declare function isValidEsInterval(interval: string): boolean;
