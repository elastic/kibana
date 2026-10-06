import type { estypes } from '@elastic/elasticsearch';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { Start as InspectorStartContract, RequestAdapter } from '@kbn/inspector-plugin/public';
import type { SearchResponseWarning } from './types';
/**
 * @internal
 */
export declare function extractWarnings(rawResponse: estypes.SearchResponse | ESQLSearchResponse, inspectorService: InspectorStartContract, requestAdapter: RequestAdapter, requestName: string, requestId?: string): SearchResponseWarning[];
