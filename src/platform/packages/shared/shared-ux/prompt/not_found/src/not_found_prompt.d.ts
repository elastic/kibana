import React from 'react';
import type { EuiEmptyPromptProps } from '@elastic/eui';
interface NotFoundProps {
    /** Array of buttons, links and other actions to show at the bottom of the `EuiEmptyPrompt`. Defaults to a "Back" button. */
    actions?: EuiEmptyPromptProps['actions'];
    title?: EuiEmptyPromptProps['title'] | string;
    body?: EuiEmptyPromptProps['body'];
}
/**
 * Predefined `EuiEmptyPrompt` for 404 pages.
 */
export declare const NotFoundPrompt: ({ actions, title, body }: NotFoundProps) => React.JSX.Element;
export {};
