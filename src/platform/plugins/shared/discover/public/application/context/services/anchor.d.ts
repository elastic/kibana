import type { ISearchSource, EsQuerySortValue } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { SearchResponseWarning } from '@kbn/search-response-warnings';
import type { DiscoverServices } from '../../../build_services';
import type { ScopedProfilesManager } from '../../../context_awareness';
export declare function fetchAnchor(anchorId: string, dataView: DataView, searchSource: ISearchSource, sort: EsQuerySortValue[], services: DiscoverServices, scopedProfilesManager: ScopedProfilesManager): Promise<{
    anchorRow: DataTableRecord;
    interceptedWarnings: SearchResponseWarning[];
}>;
export declare function updateSearchSource(searchSource: ISearchSource, anchorId: string, sort: EsQuerySortValue[], dataView: DataView): ISearchSource;
