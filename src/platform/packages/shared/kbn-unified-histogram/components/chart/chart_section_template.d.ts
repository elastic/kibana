import React from 'react';
import type { SerializedStyles } from '@emotion/serialize';
import { type IconButtonGroupProps } from '@kbn/shared-ux-button-toolbar';
export interface ChartSectionTemplateProps {
    id: string;
    toolbarCss?: SerializedStyles;
    toolbar?: {
        toggleActions?: React.ReactElement;
        leftSide?: React.ReactNode;
        rightSide?: IconButtonGroupProps['buttons'];
        additionalControls?: {
            prependRight?: React.ReactNode;
        };
    };
    toolbarWrapAt?: 'xs' | 's' | 'm' | 'l' | 'xl' | 'xxl';
}
export declare const ChartSectionTemplate: ({ id, toolbarCss, toolbar, children, toolbarWrapAt, }: React.PropsWithChildren<ChartSectionTemplateProps>) => React.JSX.Element;
