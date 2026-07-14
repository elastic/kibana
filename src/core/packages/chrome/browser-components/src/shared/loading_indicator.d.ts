import type { EuiIconProps } from '@elastic/eui';
import React from 'react';
export interface LoadingIndicatorProps {
    showAsBar?: boolean;
    customLogo?: string;
    elasticLogoColor?: EuiIconProps['color'];
}
export declare const LoadingIndicator: ({ showAsBar, customLogo, elasticLogoColor, }: LoadingIndicatorProps) => React.JSX.Element;
