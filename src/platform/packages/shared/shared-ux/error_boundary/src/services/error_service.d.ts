import type React from 'react';
import type { KibanaErrorBoundaryProviderDeps } from '../../types';
export declare const DEFAULT_MAX_ERROR_DURATION_MS: number;
export declare const TRANSIENT_NAVIGATION_WINDOW_MS = 250;
interface ErrorServiceError {
    error: Error;
    errorInfo?: React.ErrorInfo;
    name: string | null;
    isFatal: boolean;
}
interface Deps {
    analytics?: KibanaErrorBoundaryProviderDeps['analytics'];
}
interface EnqueuedError extends ErrorServiceError {
    id: string;
    isReported: boolean;
    initialPathname: string;
    hasTransientNavigation: boolean;
    transientNavigationDetermined: boolean;
    enqueuedAt: number;
    committedAt?: number;
    timeoutId?: ReturnType<typeof setTimeout>;
}
/**
 * Kibana Error Boundary Services: Error Service
 * Each Error Boundary tracks an instance of this class
 * @internal
 */
export declare class KibanaErrorService {
    private analytics?;
    private enqueuedErrors;
    constructor(deps: Deps);
    /**
     * Determines if the error fallback UI should appear as an apologetic but promising "Refresh" button,
     * or treated with "danger" coloring and include a detailed error message.
     */
    private getIsFatal;
    /**
     * Derive the name of the component that threw the error
     */
    private getErrorComponentName;
    private getCurrentPathname;
    getAnalyticsReference(): {
        reportEvent: (eventType: string, eventData: object) => void;
    } | undefined;
    /**
     * Enqueues an error to be reported later with timing and navigation information
     * @param error The error that was thrown
     * @param errorInfo React error info containing component stack
     * @returns An ID for the enqueued error that can be used to commit it later
     */
    enqueueError(error: Error, errorInfo?: React.ErrorInfo): EnqueuedError;
    /**
     * Handles the transient navigation check after TRANSIENT_NAVIGATION_WINDOW_MS
     * @private
     */
    private handleTransientNavigationCheck;
    /**
     * Commits an error, ensuring transient navigation has been determined
     * @param errorId The ID of the enqueued error
     * @returns The error object or null if not found or already committed
     */
    commitError(errorId: string): ErrorServiceError | null;
    /**
     * Actually reports the error telemetry
     * @private
     */
    private reportError;
}
export {};
