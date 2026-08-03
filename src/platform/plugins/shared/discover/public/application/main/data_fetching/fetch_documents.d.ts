import type { ISearchSource } from '@kbn/data-plugin/public';
import type { RecordsFetchResponse } from '../../types';
import type { CommonFetchParams } from './fetch_all';
/**
 * Requests the documents for Discover. This will return a promise that will resolve
 * with the documents.
 */
export declare const fetchDocuments: (searchSource: ISearchSource, { abortController, inspectorAdapters, searchSessionId, services, scopedProfilesManager, getCurrentTab, }: CommonFetchParams) => Promise<RecordsFetchResponse>;
