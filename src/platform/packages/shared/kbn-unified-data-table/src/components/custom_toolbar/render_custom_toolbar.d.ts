import React from 'react';
import type { EuiDataGridCustomToolbarProps } from '@elastic/eui';
import { type UseEuiTheme } from '@elastic/eui';
export interface UnifiedDataTableRenderCustomToolbarProps {
    toolbarProps: EuiDataGridCustomToolbarProps;
    gridProps: {
        additionalControls?: React.ReactNode;
        inTableSearchControl?: React.ReactNode;
    };
}
export type UnifiedDataTableRenderCustomToolbar = (props: UnifiedDataTableRenderCustomToolbarProps) => React.ReactElement;
interface RenderCustomToolbarProps extends UnifiedDataTableRenderCustomToolbarProps {
    saveToDashboardButton?: React.ReactElement;
    leftSide?: React.ReactElement;
    bottomSection?: React.ReactElement;
}
export declare const internalRenderCustomToolbar: (props: RenderCustomToolbarProps) => React.ReactElement;
export declare const renderCustomToolbar: UnifiedDataTableRenderCustomToolbar;
/**
 * Render custom element on the left side and all controls to the right
 */
export declare const getRenderCustomToolbarWithElements: ({ saveToDashboardButton, leftSide, bottomSection, }: {
    saveToDashboardButton?: React.ReactElement;
    leftSide?: React.ReactElement;
    bottomSection?: React.ReactElement;
}) => UnifiedDataTableRenderCustomToolbar;
export declare const styles: {
    toolbar: ({ euiTheme }: UseEuiTheme) => import("@emotion/react").SerializedStyles;
    controlButton: ({ euiTheme }: UseEuiTheme) => import("@emotion/react").SerializedStyles | undefined;
    controlGroup: ({ euiTheme }: UseEuiTheme) => import("@emotion/react").SerializedStyles | undefined;
    controlGroupIconButton: ({ euiTheme }: UseEuiTheme) => import("@emotion/react").SerializedStyles;
    toolbarBottom: import("@emotion/react").SerializedStyles;
};
export {};
