import React from 'react';
import { type EuiIconProps, type IconSize } from '@elastic/eui';
import type { AiButtonIconType } from '../../ai_button/src/types';
export interface AiIconProps extends Omit<EuiIconProps, 'type'> {
    iconType: AiButtonIconType;
    size?: IconSize;
}
/** Renders an AI icon with a gradient fill */
export declare const AiIcon: ({ iconType, size, css: userCss, ...rest }: AiIconProps) => React.JSX.Element;
