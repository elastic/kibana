import React from 'react';
import type { ConnectionRequestParams } from '@elastic/transport';
interface RequestDetailsRequestContentProps {
    indexPattern?: string;
    requestParams?: ConnectionRequestParams;
    json: string;
}
export declare const RequestDetailsRequestContent: React.FC<RequestDetailsRequestContentProps>;
export {};
