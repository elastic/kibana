import React from 'react';
import { type EuiButtonProps } from '@elastic/eui';
export declare const tooltipDataTestSubj = "cps-project-picker-button-tooltip";
export interface ProjectPickerButtonProps extends Pick<EuiButtonProps, 'size' | 'isDisabled'> {
    onClick: () => void;
    customTooltipContent?: string;
}
export declare const ProjectPickerButton: ({ onClick, size, isDisabled, customTooltipContent, }: ProjectPickerButtonProps) => React.JSX.Element;
