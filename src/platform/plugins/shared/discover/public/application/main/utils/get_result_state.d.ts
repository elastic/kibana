import { FetchStatus } from '../../types';
export declare const resultStatuses: {
    UNINITIALIZED: string;
    LOADING: string;
    READY: string;
    NO_RESULTS: string;
};
/**
 * Returns the current state of the result, depends on fetchStatus and the given fetched rows
 * Determines what is displayed in Discover main view (loading view, data view, empty data view, ...)
 */
export declare function getResultState(fetchStatus: FetchStatus, foundDocuments?: boolean): string;
