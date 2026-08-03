import React from 'react';
import type { SerializedError } from 'redux-toolkit-v1';
export declare const InitializationError: ({ error: originalError, }: {
    error: Error | SerializedError;
}) => React.JSX.Element;
