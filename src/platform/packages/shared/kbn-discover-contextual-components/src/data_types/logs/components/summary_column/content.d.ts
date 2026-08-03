import React, { type ReactNode } from 'react';
import { type DataGridCellValueElementProps } from '@kbn/unified-data-table';
import type { ShouldShowFieldInTableHandler } from '@kbn/discover-utils';
import type { EuiThemeComputed } from '@elastic/eui';
interface ContentProps extends DataGridCellValueElementProps {
    isCompressed: boolean;
    isSingleLine?: boolean;
    shouldShowFieldHandler: ShouldShowFieldInTableHandler;
}
/**
 * Applies log level highlighting to a React node tree. This function processes both
 * string nodes and existing React elements (like search highlights), preserving the
 * search highlight <mark> elements while adding log level styling spans.
 * @internal Exported for testing purposes only
 */
export declare const applyLogLevelHighlighting: (node: ReactNode, euiTheme: EuiThemeComputed, isDarkTheme: boolean) => ReactNode;
/**
 * Highlights log level terms in a plain string, returning React nodes.
 * @internal Exported for testing purposes only
 */
export declare const highlightLogLevelsInString: (text: string, euiTheme: EuiThemeComputed, isDarkTheme: boolean) => ReactNode;
export declare const Content: ({ columnId, dataView, fieldFormats, isCompressed, isSingleLine, row, shouldShowFieldHandler, columnsMeta, }: ContentProps) => React.JSX.Element;
export {};
