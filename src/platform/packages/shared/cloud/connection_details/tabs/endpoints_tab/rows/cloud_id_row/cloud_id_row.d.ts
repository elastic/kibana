import * as React from 'react';
export interface CloudIdRowProps {
    value: string;
    showCloudId: boolean;
    learnMoreUrl?: string;
    onShowCloudIdToggle: () => void;
    onCopyClick?: () => void;
}
export declare const CloudIdRow: React.FC<CloudIdRowProps>;
