import React from 'react';
import type { IconType } from '@elastic/eui';
export interface EmptyPlaceholderProps {
    icon: IconType;
    iconColor?: string;
    message?: JSX.Element | string;
    dataTestSubj?: string;
    className?: string;
    renderComplete?: () => void;
}
export declare const EmptyPlaceholder: ({ icon, iconColor, message, dataTestSubj, className, renderComplete, }: EmptyPlaceholderProps) => React.JSX.Element;
