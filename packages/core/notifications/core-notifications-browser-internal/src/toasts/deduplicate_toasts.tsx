/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactNode } from 'react';

import { EuiNotificationBadge } from '@elastic/eui';
import { Toast } from '@kbn/core-notifications-browser';
import { MountPoint } from '@kbn/core-mount-utils-browser';

export interface DeduplicateResult {
  toasts: Toast[];
  idToToasts: Record<string, Toast[]>;
}

/**
 * Collects toast messages to groups based on the `getKeyOf` function,
 * then represents every group of message with a single toast
 * @param allToasts
 * @return the deduplicated list of toasts, and a lookup to find toasts represented by their first toast's ID
 */
export function deduplicateToasts(allToasts: Toast[]): DeduplicateResult {
  const toastGroups = groupByKey(allToasts);

  const distinctToasts: Toast[] = [];
  const idToToasts: Record<string, Toast[]> = {};
  for (const toastGroup of Object.values(toastGroups)) {
    const firstElement = toastGroup[0];
    idToToasts[firstElement.id] = toastGroup;
    if (toastGroup.length === 1) {
      distinctToasts.push(firstElement);
    } else {
      distinctToasts.push({
        ...firstElement,
        title: <TitleWithBadge title={firstElement.title} counter={toastGroup.length} />,
      });
    }
  }

  return { toasts: distinctToasts, idToToasts };
}

/**
 * Extracts a key from a toast message
 * these keys decide what makes between different toasts, and which ones should be merged
 * Ideally we want different (header+text) combinations to appear as separate toast messages
 * @param toast
 */
function getKeyOf(toast: Toast): string {
  if (isString(toast.title) && isString(toast.text)) {
    return toast.title + ' ' + toast.text;
  } else if (isString(toast.text)) {
    return toast.text;
  } else if (isString(toast.title)) {
    return toast.title;
  } else {
    // Both title & text is missing or a mount function
    return 'KEY_' + toast.id.toString();
  }
}

function isString(a: string | any): a is string {
  return typeof a === 'string';
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

interface TitleWithBadgeProps {
  title: MountPoint | ReactNode;
  counter: number;
}

export function TitleWithBadge({ title, counter }: TitleWithBadgeProps) {
  const hostRef = React.useRef<HTMLSpanElement>(null);
  const hostElement = <span ref={hostRef} />;
  const renderedTitle = title instanceof Function ? hostElement : <span>{title}</span>;

  React.useEffect(() => {
    if (title instanceof Function && hostRef.current) {
      return title(hostRef.current);
    }
  }, [title]);

  return (
    <React.Fragment>
      {renderedTitle}{' '}
      <EuiNotificationBadge color="subdued" className="eui-alignTop">
        {counter}
      </EuiNotificationBadge>
    </React.Fragment>
  );
}
