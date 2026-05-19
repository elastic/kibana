import type { Filter } from './types';
/**
 * @internal used only by the filter bar to create filter pills.
 */
export declare function getFilterParams(filter: Filter): Filter['meta']['params'];
