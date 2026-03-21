import { type Observable } from 'rxjs';
import { type FetchContext } from './fetch_context';
export declare function fetch$(api: unknown): Observable<FetchContext>;
export declare const useFetchContext: (api: unknown) => FetchContext;
