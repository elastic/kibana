import type { estypes } from '@elastic/elasticsearch';
import type { RequestStatistics } from '@kbn/inspector-plugin/common';
import type { ISearchSource } from '../../../../public';
/** @public */
export declare function getRequestInspectorStats(searchSource: ISearchSource): RequestStatistics;
/** @public */
export declare function getResponseInspectorStats(resp?: estypes.SearchResponse<unknown>, searchSource?: ISearchSource): RequestStatistics;
