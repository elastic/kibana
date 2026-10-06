/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import type React from 'react';
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
