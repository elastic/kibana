import React from 'react';
import type { EuiToolTipProps } from '@elastic/eui';
export type TooltipProps = Partial<Omit<EuiToolTipProps, 'content'>> & {
    content: string;
    show: boolean;
};
export declare const Tooltip: React.FC<TooltipProps>;
