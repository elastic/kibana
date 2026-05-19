import React from 'react';
import type { EuiToolTipProps } from '@elastic/eui';
export type TooltipWrapperProps = Partial<Omit<EuiToolTipProps, 'content'>> & {
    tooltipContent: string;
    /** When the condition is truthy, the tooltip will be shown */
    condition: boolean;
};
export declare const TooltipWrapper: React.FunctionComponent<TooltipWrapperProps>;
