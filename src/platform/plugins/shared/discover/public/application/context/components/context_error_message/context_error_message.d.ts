import React from 'react';
import type { LoadingStatusEntry } from '../../services/context_query_state';
export interface ContextErrorMessageProps {
    /**
     * the status of the loading action
     */
    status: LoadingStatusEntry;
}
export declare function ContextErrorMessage({ status }: ContextErrorMessageProps): React.JSX.Element | null;
