import type { Filter, DataViewFieldBase, DataViewBase } from '@kbn/es-query';
import type { FilterManager } from '../filter_manager';
/**
 * Generate filter objects, as a result of triggering a filter action on a
 * specific index pattern field.
 *
 * @param {FilterManager} filterManager - The active filter manager to lookup for existing filters
 * @param {Field | string} field - The field for which filters should be generated
 * @param {any} values - One or more values to filter for.
 * @param {string} operation - "-" to create a negated filter
 * @param {string} index - Index string to generate filters for
 *
 * @returns {object} An array of filters to be added back to filterManager
 */
export declare function generateFilters(filterManager: FilterManager, field: DataViewFieldBase | string, values: any, operation: string, index: DataViewBase): Filter[];
