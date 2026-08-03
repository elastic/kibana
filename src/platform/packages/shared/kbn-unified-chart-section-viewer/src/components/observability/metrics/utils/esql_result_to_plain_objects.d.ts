import type { ESQLSearchResponse } from '@kbn/es-types';
/**
 * Parses ESQL results by combining columns and rows into plain objects.
 * ESQL returns { columns: [{ name, type }, ...], values: [[...], [...], ...] };
 * each row is an array of values. This maps each row to an object whose keys
 * are the column names and values are the row cells.
 *
 * @example
 * // ESQL returns columns + rows:
 * // columns: [{ name: 'host.name', type: 'keyword' }, { name: 'cpu', type: 'double' }]
 * // values:  [['host-a', 0.5], ['host-b', 0.8]]
 * // Result: [{ 'host.name': 'host-a', cpu: 0.5 }, { 'host.name': 'host-b', cpu: 0.8 }]
 */
export declare function esqlResultToPlainObjects<TDocument extends object = Record<string, unknown>>(result: ESQLSearchResponse): TDocument[];
