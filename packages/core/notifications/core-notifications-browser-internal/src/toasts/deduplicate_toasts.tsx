/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Toast } from '@kbn/core-notifications-browser';
import { mountReactNode } from '@kbn/core-mount-utils-browser-internal';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiNotificationBadge } from '@elastic/eui';
import React from 'react';

interface ToastRepresentation {
  toasts: Toast[];
}

export function deduplicateToasts(allToasts: Toast[], dismissToast: (id: string) => void) {
  const toastGroups: Record<string, ToastRepresentation> = {};
  const closeAll = (tx: Toast[]) => () => {
    for (const t of tx) {
      dismissToast(t.id);
    }
  };

  allToasts.forEach((toast) => {
    const key = getKeyOf(toast);

    if (!toastGroups[key]) {
      toastGroups[key] = { toasts: [toast] };
    } else {
      toastGroups[key].toasts.push(toast);
    }
  });

  const distinctToasts = [];
  Object.keys(toastGroups).forEach((key) => {
    const toastList = toastGroups[key].toasts;
    if (toastList.length === 1) {
      distinctToasts.push(toastList[0]);
    } else {
      const representation: Toast = createMulticardToast(toastList, closeAll);
      distinctToasts.push(representation);
    }
  });

  if (distinctToasts.length >= 2) {
    distinctToasts.push({
      id: 'ID_close_all',
      text: mountReactNode(
        <EuiButton onClick={closeAll(allToasts.concat({ id: 'ID_close_all' }))}>
          Close all notifications
        </EuiButton>
      ),
      toastLifeTimeMs: 100000,
    });
  }

  return distinctToasts;
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

function createMulticardToast(toasts: Toast[], closeAll: (tx: Toast[]) => () => void) {
  const firstElement = toasts[0];
  const key = getKeyOf(firstElement);
  return {
    ...firstElement,
    id: key,
    text: firstElement.text + ' ' + key,
    toastLifeTimeMs: 50000,
    onClose: closeAll(toasts),
    // TODO: this causes an error, because the unmount is not called on a react root
    // title: `${firstElement.title} (${toastList.length})`,
    title: mountReactNode(
      <EuiFlexGroup justifyContent="flexStart">
        <EuiFlexItem grow={false}>
          <EuiNotificationBadge>{toasts.length}</EuiNotificationBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{firstElement.title}</EuiFlexItem>
      </EuiFlexGroup>
    ),
  };
}
