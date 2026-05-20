import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import type { EuiTextColorProps } from '@elastic/eui';
export interface TextWithIconProps {
    color?: EuiTextColorProps['color'];
    tooltip?: React.ReactNode;
    icon?: string;
    iconColor?: string;
    iconTooltip?: React.ReactNode;
}
export declare const TextWithIcon: FC<PropsWithChildren<TextWithIconProps>>;
