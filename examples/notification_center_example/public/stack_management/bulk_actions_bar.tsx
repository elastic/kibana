/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useContentListSelection } from '@kbn/content-list-provider';
import type { ContentListItem } from '@kbn/content-list-provider';
import { useNotificationEventsService } from '@kbn/core-notifications-browser-hooks';
import type { NotificationStackItem } from '@kbn/core-notifications-browser-components';

/**
 * Bulk action bar for the notification stack table.
 *
 * Renders when one or more rows are selected; provides "Mark N as read" and
 * "Pin N" bulk operations. Deletion is handled by the built-in `SelectionBar`
 * that appears in the `ContentListToolbar` when `item.onDelete` is set on the
 * `ContentListProvider`.
 *
 * Must be rendered inside both `ContentListProvider` and `NotificationEventsProvider`.
 */
export function BulkActionsBar() {
  const events = useNotificationEventsService();
  const { selectedItems, selectedCount, clearSelection } = useContentListSelection();

  const handleMarkAsRead = useCallback(async () => {
    await Promise.all(selectedItems.map((item: ContentListItem) => events.markAsRead(item.id, true)));
    clearSelection();
  }, [selectedItems, events, clearSelection]);

  const handlePin = useCallback(async () => {
    await Promise.all(
      selectedItems.map((item: ContentListItem) => {
        const n = item as NotificationStackItem;
        return n.isPinned ? events.unpin(item.id) : events.pin(item.id);
      })
    );
    clearSelection();
  }, [selectedItems, events, clearSelection]);

  if (selectedCount === 0) return null;

  return (
    <>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            iconType="check"
            onClick={() => void handleMarkAsRead()}
            data-test-subj="notificationStackBulkMarkAsRead"
          >
            {i18n.translate('notificationCenterExample.stack.bulk.markAsRead', {
              defaultMessage: 'Mark {count, plural, one {# notification} other {# notifications}} as read',
              values: { count: selectedCount },
            })}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            iconType="pin"
            onClick={() => void handlePin()}
            data-test-subj="notificationStackBulkPin"
          >
            {i18n.translate('notificationCenterExample.stack.bulk.pin', {
              defaultMessage: 'Pin {count, plural, one {# notification} other {# notifications}}',
              values: { count: selectedCount },
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
    </>
  );
}
