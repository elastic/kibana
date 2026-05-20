import React from 'react';
import { type ChartSectionTemplateProps } from '@kbn/unified-histogram';
export interface ChartsGridProps extends Pick<ChartSectionTemplateProps, 'toolbar' | 'toolbarCss' | 'toolbarWrapAt' | 'id'> {
    isFullscreen?: boolean;
    isComponentVisible?: boolean;
    onToggleFullscreen?: () => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLElement>) => void;
}
export declare const ChartsGrid: ({ id, toolbarCss, toolbar, toolbarWrapAt, isFullscreen, children, isComponentVisible, onKeyDown, }: React.PropsWithChildren<ChartsGridProps>) => React.JSX.Element;
