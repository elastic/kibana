import type { ReactNode } from 'react';
import React from 'react';
import type { Toast } from '@kbn/core-notifications-browser';
import type { MountPoint } from '@kbn/core-mount-utils-browser';
/**
 * We can introduce this type within this domain, to allow for react-managed titles
 */
export type ToastWithRichTitle = Omit<Toast, 'title'> & {
    title?: MountPoint | ReactNode;
};
export interface DeduplicateResult {
    toasts: ToastWithRichTitle[];
    idToToasts: Record<string, Toast[]>;
}
interface TitleWithBadgeProps {
    title: string | undefined;
    counter: number;
}
/**
 * Collects toast messages to groups based on the `getKeyOf` function,
 * then represents every group of message with a single toast
 * @param allToasts
 * @return the deduplicated list of toasts, and a lookup to find toasts represented by their first toast's ID
 */
export declare function deduplicateToasts(allToasts: Toast[]): DeduplicateResult;
/**
 * A component that renders a title with a floating counter
 * @param title {string} The title string
 * @param counter {number} The count of notifications represented
 */
export declare function TitleWithBadge({ title, counter }: TitleWithBadgeProps): React.JSX.Element;
export {};
