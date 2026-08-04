import type { IKibanaSearchResponse } from '@kbn/search-types';
import type { AggTypesDependencies } from '..';
/**
 * @returns true if response is abort
 */
export declare const isAbortResponse: (response?: IKibanaSearchResponse | {
    response: IKibanaSearchResponse;
}) => response is undefined;
/**
 * @returns true if request is still running
 */
export declare const isRunningResponse: (response?: IKibanaSearchResponse) => boolean;
export declare const getUserTimeZone: (getConfig: AggTypesDependencies["getConfig"], shouldDetectTimezone?: boolean) => string;
export declare function strategyToString(strategy?: string | symbol): string;
