import React from 'react';
import type { DocView, DocViewRenderProps } from '../../types';
interface Props {
    docView: DocView;
    renderProps: DocViewRenderProps;
}
/**
 * Renders the tab content of a doc view.
 * Displays an error message when it encounters exceptions, thanks to
 * Error Boundaries.
 */
export declare const DocViewerTab: ({ docView, renderProps }: Props) => React.JSX.Element;
export {};
