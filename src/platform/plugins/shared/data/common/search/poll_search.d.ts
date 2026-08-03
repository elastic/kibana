import type { Observable } from 'rxjs';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import type { IAsyncSearchOptions } from '..';
export declare const pollSearch: <Response extends IKibanaSearchResponse>(search: () => Promise<Response>, cancel?: () => Promise<void>, { pollInterval, abortSignal }?: IAsyncSearchOptions) => Observable<Response>;
