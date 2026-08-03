import type { SqlGetAsyncRequest, SqlQueryRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ISearchOptions } from '@kbn/search-types';
import type { SearchConfigSchema } from '../../../config';
/**
 @internal
 */
export declare function getDefaultAsyncSubmitParams(searchConfig: SearchConfigSchema, options: ISearchOptions): Pick<SqlQueryRequest, 'keep_alive' | 'wait_for_completion_timeout' | 'keep_on_completion'>;
/**
 @internal
 */
export declare function getDefaultAsyncGetParams(searchConfig: SearchConfigSchema, options: ISearchOptions): Pick<SqlGetAsyncRequest, 'keep_alive' | 'wait_for_completion_timeout'>;
