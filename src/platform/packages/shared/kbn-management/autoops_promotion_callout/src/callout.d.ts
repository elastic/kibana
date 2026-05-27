import React from 'react';
import type { EuiCallOutProps } from '@elastic/eui';
export interface AutoOpsPromotionCalloutProps {
    cloudConnectUrl?: string;
    onConnectClick?: (e: React.MouseEvent) => void;
    hasCloudConnectPermission?: boolean;
    overrideCalloutProps?: Partial<Omit<EuiCallOutProps, 'children' | 'title' | 'onDismiss'>>;
}
export declare const AUTOOPS_CALLOUT_DISMISSED_KEY = "kibana.autoOpsPromotionCallout.dismissed";
export declare const AutoOpsPromotionCallout: ({ cloudConnectUrl, onConnectClick, hasCloudConnectPermission, overrideCalloutProps, }: AutoOpsPromotionCalloutProps) => React.JSX.Element | null;
