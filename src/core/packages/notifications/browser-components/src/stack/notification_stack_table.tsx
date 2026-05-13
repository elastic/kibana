/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { ContentListTable } from '@kbn/content-list-table';
import type { ContentListItem } from '@kbn/content-list-provider';
import { i18n } from '@kbn/i18n';
import { UnreadIndicatorCell } from './columns/unread_indicator_cell';
import { TypeCell } from './columns/type_cell';
import { SpaceCell } from './columns/space_cell';
import { ReceivedCell } from './columns/received_cell';
import type { NotificationStackItem } from './types';
import { PinnedIndicatorCell } from './columns/pinned_indicator_cell';

const { Column, Action } = ContentListTable;

export interface NotificationStackTableProps {
  /** Called when the user clicks "Mark as read" or "Mark as unread" on a row. */
  onMarkAsRead: (item: NotificationStackItem) => void;
  /** Called when the user clicks "Pin" or "Unpin" on a row. */
  onTogglePin: (item: NotificationStackItem) => void;
}

const TABLE_TITLE = i18n.translate('core.notifications.stack.table.title', {
  defaultMessage: 'Notifications',
});

const COL_TYPE = i18n.translate('core.notifications.stack.table.column.type', {
  defaultMessage: 'Type',
});

const COL_SPACE = i18n.translate('core.notifications.stack.table.column.space', {
  defaultMessage: 'Space',
});

const COL_RECEIVED = i18n.translate('core.notifications.stack.table.column.received', {
  defaultMessage: 'Received',
});

const ACTION_MARK_READ = i18n.translate('core.notifications.stack.table.action.markRead', {
  defaultMessage: 'Mark as read',
});

const ACTION_MARK_UNREAD = i18n.translate('core.notifications.stack.table.action.markUnread', {
  defaultMessage: 'Mark as unread',
});

const ACTION_PIN = i18n.translate('core.notifications.stack.table.action.pin', {
  defaultMessage: 'Pin',
});

const ACTION_UNPIN = i18n.translate('core.notifications.stack.table.action.unpin', {
  defaultMessage: 'Unpin',
});

const ACTION_CLEAR = i18n.translate('core.notifications.stack.table.action.clear', {
  defaultMessage: 'Clear',
});

/**
 * Pre-configured `ContentListTable` for the notification stack management page.
 *
 * Must be rendered inside a `ContentListProvider`. Accepts callbacks for
 * per-row actions; deletion (Clear) is handled by `item.onDelete` on the
 * provider and surfaces via the built-in `Action.Delete` row action.
 */
export const NotificationStackTable = ({
  onMarkAsRead,
  onTogglePin,
}: NotificationStackTableProps) => {
  return (
    <ContentListTable title={TABLE_TITLE}>
      <Column
        id="read"
        name=""
        width="36px"
        minWidth="36px"
        maxWidth="36px"
        render={(item: ContentListItem) => <UnreadIndicatorCell item={item} />}
      />
      <Column
        id="pinned"
        name=""
        width="36px"
        minWidth="36px"
        maxWidth="36px"
        render={(item: ContentListItem) => (
          <PinnedIndicatorCell item={item as NotificationStackItem} onTogglePin={onTogglePin} />
        )}
      />
      <Column.Name showDescription />
      <Column
        id="type"
        name={COL_TYPE}
        width="9em"
        minWidth="6em"
        maxWidth="9em"
        render={(item: ContentListItem) => <TypeCell item={item} />}
      />
      <Column
        id="space"
        name={COL_SPACE}
        width="8em"
        minWidth="6em"
        maxWidth="8em"
        render={(item: ContentListItem) => <SpaceCell item={item} />}
      />
      <Column
        id="timestamp"
        name={COL_RECEIVED}
        field="timestamp"
        sortable
        width="9em"
        minWidth="max-content"
        maxWidth="9em"
        render={(item: ContentListItem) => <ReceivedCell item={item} />}
      />
      <Column.Actions>
        <Action
          id="markAsRead"
          name={(item: ContentListItem) =>
            (item as NotificationStackItem).isRead ? ACTION_MARK_UNREAD : ACTION_MARK_READ
          }
          icon="check"
          available={(item: ContentListItem) => !(item as NotificationStackItem).isRead}
          onClick={(item: ContentListItem) => onMarkAsRead(item as NotificationStackItem)}
          data-test-subj="notificationStackActionMarkAsRead"
        />
        <Action
          id="markAsUnread"
          name={ACTION_MARK_UNREAD}
          icon="minus"
          available={(item: ContentListItem) => (item as NotificationStackItem).isRead}
          onClick={(item: ContentListItem) => onMarkAsRead(item as NotificationStackItem)}
          data-test-subj="notificationStackActionMarkAsUnread"
        />
        <Action
          id="pin"
          name={ACTION_PIN}
          icon="pin"
          available={(item: ContentListItem) => !(item as NotificationStackItem).isPinned}
          onClick={(item: ContentListItem) => onTogglePin(item as NotificationStackItem)}
          data-test-subj="notificationStackActionPin"
        />
        <Action
          id="unpin"
          name={ACTION_UNPIN}
          icon="pinFilled"
          available={(item: ContentListItem) => !!(item as NotificationStackItem).isPinned}
          onClick={(item: ContentListItem) => onTogglePin(item as NotificationStackItem)}
          data-test-subj="notificationStackActionUnpin"
        />
        <Action.Delete label={ACTION_CLEAR} />
      </Column.Actions>
    </ContentListTable>
  );
};
