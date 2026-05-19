import React from 'react';
import type { ApplicationStart } from '@kbn/core/public';
import { KbnError } from '@kbn/kibana-utils-plugin/common';
export declare enum TimeoutErrorMode {
    CONTACT = 0,
    CHANGE = 1
}
/**
 * Request Failure - When an entire multi request fails
 * @param {Error} err - the Error that came back
 */
export declare class SearchTimeoutError extends KbnError {
    mode: TimeoutErrorMode;
    constructor(err: Record<string, any>, mode: TimeoutErrorMode);
    private getMessage;
    private getActionText;
    private onClick;
    getErrorMessage(application: ApplicationStart): React.JSX.Element;
}
