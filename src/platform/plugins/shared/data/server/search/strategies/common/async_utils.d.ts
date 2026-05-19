import type { AsyncSearchSubmitRequest, AsyncSearchGetRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ISearchOptions } from '@kbn/search-types';
import type { SearchConfigSchema } from '../../../config';
/**
 @internal
 */
export declare function getCommonDefaultAsyncSubmitParams(config: SearchConfigSchema, options: ISearchOptions, 
/**
 * Allows to override some of internal logic (e.g. eql / sql searches don't fully support search sessions yet)
 */
overrides?: {
    disableSearchSessions?: true;
}): Pick<AsyncSearchSubmitRequest, 'keep_alive' | 'wait_for_completion_timeout' | 'keep_on_completion'> & {
    project_routing?: string;
};
/**
 @internal
 */
export declare function getCommonDefaultAsyncGetParams(config: SearchConfigSchema, options: ISearchOptions, 
/**
 * Allows to override some of internal logic (e.g. eql / sql searches don't fully support search sessions yet)
 */
overrides?: {
    disableSearchSessions?: true;
}): Pick<AsyncSearchGetRequest, 'keep_alive' | 'wait_for_completion_timeout'>;
