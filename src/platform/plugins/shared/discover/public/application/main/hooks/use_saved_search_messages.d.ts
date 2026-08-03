import type { BehaviorSubject } from 'rxjs';
import type { DataTableRecord } from '@kbn/discover-utils/src/types';
import type { SearchResponseWarning } from '@kbn/search-response-warnings';
import { FetchStatus } from '../../types';
import type { DataDocuments$, DataMain$, DataMsg, DataTotalHits$, SavedSearchData } from '../state_management/discover_data_state_container';
/**
 * Sends COMPLETE message to the main$ observable with the information
 * that no documents have been found, allowing Discover to show a no
 * results message.
 */
export declare function sendNoResultsFoundMsg(main$: DataMain$): void;
/**
 * Send COMPLETE message via main observable used when
 * 1.) first fetch resolved, and there are no documents
 * 2.) all fetches resolved, and there are documents
 */
export declare function sendCompleteMsg(main$: DataMain$, foundDocuments?: boolean): void;
/**
 * Send PARTIAL message via main observable when first result is returned
 */
export declare function sendPartialMsg(main$: DataMain$): void;
/**
 * Send LOADING message via main observable
 */
export declare function sendLoadingMsg<T extends DataMsg>(data$: BehaviorSubject<T>, props?: Omit<T, 'fetchStatus'>): void;
/**
 * Send LOADING_MORE message via main observable
 */
export declare function sendLoadingMoreMsg(documents$: DataDocuments$): void;
/**
 * Finishing LOADING_MORE message
 */
export declare function sendLoadingMoreFinishedMsg(documents$: DataDocuments$, { moreRecords, interceptedWarnings, }: {
    moreRecords: DataTableRecord[];
    interceptedWarnings: SearchResponseWarning[] | undefined;
}): void;
/**
 * Send ERROR message
 */
export declare function sendErrorMsg<T extends DataMsg>(data$: DataMain$ | DataDocuments$ | DataTotalHits$, error?: Error, props?: Omit<T, 'fetchStatus' | 'error'>): void;
/**
 * Sends a RESET message to all data subjects
 * Needed when data view is switched or a new runtime field is added
 */
export declare function sendResetMsg(data: SavedSearchData, initialFetchStatus: FetchStatus): void;
/**
 * Method to create an error handler that will forward the received error
 * to the specified subjects. It will ignore AbortErrors.
 */
export declare const sendErrorTo: (...errorSubjects: Array<DataMain$ | DataDocuments$>) => (error: Error) => void;
/**
 * This method checks the passed in hit count and will send a PARTIAL message to main$
 * if there are results, indicating that we have finished some of the requests that have been
 * sent. If there are no results we already COMPLETE main$ with no results found, so Discover
 * can show the "no results" screen. We know at that point, that the other query returning
 * will neither carry any data, since there are no documents.
 */
export declare const checkHitCount: (main$: DataMain$, hitsCount: number) => void;
