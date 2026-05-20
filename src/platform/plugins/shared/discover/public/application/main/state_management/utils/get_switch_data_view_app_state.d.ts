import type { Query, AggregateQuery } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { SortOrder } from '@kbn/saved-search-plugin/public';
import type { DiscoverAppState } from '../redux';
/**
 * Helper function to remove or adapt the currently selected columns/sort to be valid with the next
 * data view, returns a new state object
 */
export declare function getDataViewAppState(currentDataView: DataView, nextDataView: DataView, defaultColumns: string[], currentColumns: string[], currentSort: SortOrder[], modifyColumns?: boolean, sortDirection?: string, query?: Query | AggregateQuery): Partial<DiscoverAppState>;
