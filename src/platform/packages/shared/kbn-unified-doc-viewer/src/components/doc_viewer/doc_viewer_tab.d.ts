import React from 'react';
import type { DocView, DocViewRenderProps } from '../../types';
import type { DocViewerProps } from './doc_viewer';
interface Props {
    docView: DocView;
    renderProps: DocViewRenderProps;
    initialDocViewerState?: DocViewerProps['initialDocViewerState'];
    onInitialDocViewerStateChange?: DocViewerProps['onInitialDocViewerStateChange'];
}
/**
 * Renders the tab content of a doc view.
 * Displays an error message when it encounters exceptions, thanks to
 * Error Boundaries.
 */
export declare const DocViewerTab: ({ docView, renderProps, initialDocViewerState, onInitialDocViewerStateChange, }: Props) => React.JSX.Element;
export {};
