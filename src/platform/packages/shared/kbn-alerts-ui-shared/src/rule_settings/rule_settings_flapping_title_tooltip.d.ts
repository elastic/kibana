import type { EuiPopoverProps } from '@elastic/eui';
import React from 'react';
interface RuleSettingsFlappingTitleTooltipProps {
    isOpen: boolean;
    setIsPopoverOpen: (isOpen: boolean) => void;
    anchorPosition?: EuiPopoverProps['anchorPosition'];
}
export declare const RuleSettingsFlappingTitleTooltip: (props: RuleSettingsFlappingTitleTooltipProps) => React.JSX.Element;
export {};
