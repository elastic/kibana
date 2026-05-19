import type { DataView } from '@kbn/data-views-plugin/common';
export type SortOrder = [string, string];
export type SortPairObj = Record<string, string>;
export type SortPair = SortOrder | SortPairObj;
export type SortInput = SortPair | SortPair[];
export declare function isSortable(fieldName: string, dataView: DataView, isEsqlMode: boolean): boolean;
export declare function isLegacySort(sort: SortPair[] | SortPair): sort is SortPair;
/**
 * Take a sorting array and make it into an object
 * @param {array} sort two dimensional array [[fieldToSort, directionToSort]]
 *  or an array of objects [{fieldToSort: directionToSort}]
 * @param {object} dataView used for determining default sort
 * @param {boolean} isEsqlMode
 * @returns Array<{object}> an array of sort objects
 */
export declare function getSort(sort: SortPair[] | SortPair, dataView: DataView, isEsqlMode: boolean): SortPairObj[];
/**
 * compared to getSort it doesn't return an array of objects, it returns an array of arrays
 * [[fieldToSort: directionToSort]]
 */
export declare function getSortArray(sort: SortInput, dataView: DataView, isEsqlMode: boolean): SortOrder[];
