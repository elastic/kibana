/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ReactNode } from 'react';
import { css } from '@emotion/css';

import { EuiNotificationBadge } from '@elastic/eui';
import { Toast } from '@kbn/core-notifications-browser';
import { MountPoint } from '@kbn/core-mount-utils-browser';

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
export function deduplicateToasts(allToasts: Toast[]): DeduplicateResult {
  const toastGroups = groupByKey(allToasts);

  const distinctToasts: ToastWithRichTitle[] = [];
  const idToToasts: Record<string, Toast[]> = {};
  for (const toastGroup of Object.values(toastGroups)) {
    const firstElement = toastGroup[0];
    idToToasts[firstElement.id] = toastGroup;
    if (toastGroup.length === 1) {
      distinctToasts.push(firstElement);
    } else {
      // Grouping will only happen for toasts whose titles are strings (or missing)
      const title = firstElement.title as string | undefined;
      distinctToasts.push({
        ...firstElement,
        title: <TitleWithBadge title={title} counter={toastGroup.length} />,
      });
    }
  }

  return { toasts: distinctToasts, idToToasts };
}

/**
 * Derives a key from a toast object
 * these keys decide what makes between different toasts, and which ones should be merged
 * These toasts will be merged:
 *  - where title and text are strings, and the same
 *  - where titles are the same, and texts are missing
 *  - where titles are the same, and the text's mount function is the same string
 *  - where titles are missing, but the texts are the same string
 * @param toast The toast whose key we're deriving
 */
function getKeyOf(toast: Toast): string {
  if (isString(toast.title) && isString(toast.text)) {
    return toast.title + ' ' + toast.text;
  } else if (isString(toast.title) && !toast.text) {
    return toast.title;
  } else if (isString(toast.title) && typeof toast.text === 'function') {
    return toast.title + ' ' + djb2Hash(toast.text.toString());
  } else if (isString(toast.text) && !toast.title) {
    return toast.text;
  } else {
    // Either toast or text is a mount function, or both missing
    return 'KEY_' + toast.id.toString();
  }
}

function isString(a: string | any): a is string {
  return typeof a === 'string';
}

// Based on: https://gist.github.com/eplawless/52813b1d8ad9af510d85
function djb2Hash(str: string): number {
  const len = str.length;
  let hash = 5381;

  for (let i = 0; i < len; i++) {
    // eslint-disable-next-line no-bitwise
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  // eslint-disable-next-line no-bitwise
  return hash >>> 0;
}

function groupByKey(allToasts: Toast[]) {
  const toastGroups: Record<string, Toast[]> = {};
  for (const toast of allToasts) {
    const key = getKeyOf(toast);

    if (!toastGroups[key]) {
      toastGroups[key] = [toast];
    } else {
      toastGroups[key].push(toast);
    }
  }
  return toastGroups;
}

const floatTopRight = css`
  position: absolute;
  top: -8px;
  right: -8px;
`;

/**
 * A component that renders a title with a floating counter
 * @param title {string} The title string
 * @param counter {number} The count of notifications represented
 */
export function TitleWithBadge({ title, counter }: TitleWithBadgeProps) {
  return (
    <React.Fragment>
      {title}{' '}
      <EuiNotificationBadge color="subdued" size="m" className={floatTopRight}>
        {counter}
      </EuiNotificationBadge>
    </React.Fragment>
  );
}
