import { type EuiButtonIconProps } from '@elastic/eui';
import React from 'react';
interface ExtraActionsButtonProps {
    onClick: () => void;
    showTooltip: boolean;
    extraActionsIconType?: EuiButtonIconProps['iconType'];
    extraActionsColor?: EuiButtonIconProps['color'];
}
export declare const ExtraActionsButton: React.FC<ExtraActionsButtonProps>;
export {};
