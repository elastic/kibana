import * as React from 'react';
export interface EndpointUrlProps {
    url: string;
    onCopyClick?: () => void;
}
export declare const EndpointUrlRow: React.FC<EndpointUrlProps>;
