import React from 'react';
import type { IHttpFetchError } from '@kbn/core-http-browser';
interface RateLimiterErrorProps {
    error: IHttpFetchError;
}
export declare function RateLimiterError({ error }: RateLimiterErrorProps): React.JSX.Element;
export {};
