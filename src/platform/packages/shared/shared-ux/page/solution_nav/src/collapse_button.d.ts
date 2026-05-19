import React from 'react';
import type { EuiButtonIconPropsForButton } from '@elastic/eui';
export type SolutionNavCollapseButtonProps = Partial<EuiButtonIconPropsForButton> & {
    /**
     * Boolean state of current collapsed status
     */
    isCollapsed: boolean;
};
/**
 * Creates the styled icon button for showing/hiding solution nav
 */
export declare const SolutionNavCollapseButton: ({ className, isCollapsed, ...rest }: SolutionNavCollapseButtonProps) => React.JSX.Element;
