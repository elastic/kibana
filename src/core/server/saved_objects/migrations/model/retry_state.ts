/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { State } from '../state';

export const delayRetryState = <S extends State>(
  state: S,
  errorMessage: string, // comes in as "[index_not_yellow_timeout] Timeout waiting for the status of the [${index}] index to become 'yellow'"
  /** How many times to retry a step that fails */
  maxRetryAttempts: number,
  /** optional link to docs */
  docLink?: string
): S => {
  const defaultReason = `Unable to complete the ${state.controlState} step after ${maxRetryAttempts} attempts, terminating.`;
  if (state.retryCount >= maxRetryAttempts) {
    return {
      ...state,
      controlState: 'FATAL',
      reason: docLink
        ? `${defaultReason} Refer to ${docLink} for information on how to resolve the issue.`
        : defaultReason,
    };
  } else {
    const retryCount = state.retryCount + 1;
    const retryDelay = 1000 * Math.min(Math.pow(2, retryCount), 64); // 2s, 4s, 8s, 16s, 32s, 64s, 64s, 64s ...
    const defaultLogsActionErrorMessage = `Action failed with '${errorMessage}'. Retrying attempt ${retryCount} in ${
      retryDelay / 1000
    } seconds.`;
    return {
      ...state,
      retryCount,
      retryDelay,
      logs: [
        ...state.logs,
        {
          level: 'error',
          message: docLink
            ? `${defaultLogsActionErrorMessage} Refer to ${docLink} for information on how to resolve the issue.`
            : defaultLogsActionErrorMessage,
        },
      ],
    };
  }
};
export const resetRetryState = <S extends State>(state: S): S => {
  return {
    ...state,
    retryCount: 0,
    retryDelay: 0,
  };
};
