import React from 'react';
import type { SerializedError } from '@reduxjs/toolkit';
export declare const InitializationError: ({ error: originalError, }: {
    error: Error | SerializedError;
}) => React.JSX.Element;
