/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import {
  ContentList,
  ContentListProvider,
  ContentListToolbar,
  ContentListFooter,
} from '@kbn/content-list';
import type { ContentListItem } from '@kbn/content-list-provider';
import { KibanaContentListPage } from '@kbn/content-list-page';
import {
  NotificationStackTable,
  type NotificationStackItem,
} from '@kbn/core-notifications-browser-components';
import { useNotificationEventsService } from '@kbn/core-notifications-browser-hooks';
import { useEventsFindItems } from './use_events_find_items';
import { NOTIFICATION_STACK_QUERY_KEY } from './constants';
import { BulkActionsBar } from './bulk_actions_bar';

const LABELS = {
  entity: i18n.translate('notificationCenterExample.stack.entity', {
    defaultMessage: 'notification',
  }),
  entityPlural: i18n.translate('notificationCenterExample.stack.entityPlural', {
    defaultMessage: 'notifications',
  }),
};

const PAGE_TITLE = i18n.translate('notificationCenterExample.stack.page.title', {
  defaultMessage: 'Notifications',
});

const SORT_FIELD_RECEIVED = i18n.translate('notificationCenterExample.stack.sort.received', {
  defaultMessage: 'Received',
});

const SORT_FIELD_NAME = i18n.translate('notificationCenterExample.stack.sort.name', {
  defaultMessage: 'Name',
});

const FEATURES = {
  urlSync: false,
  sorting: {
    initialSort: { field: 'timestamp', direction: 'desc' as const },
    fields: [
      { field: 'timestamp', name: SORT_FIELD_RECEIVED },
      { field: 'title', name: SORT_FIELD_NAME },
    ],
  },
  pagination: { initialPageSize: 20 },
};

const { Filters } = ContentListToolbar;

/**
 * Full-page notification stack management view.
 *
 * Wraps `ContentListProvider` + `ContentListTable` (via `NotificationStackTable`)
 * with a reactive adapter that sources data from the notification events observable.
 * Must be rendered inside a `NotificationEventsProvider`.
 */
export function StackManagementPage() {
  const events = useNotificationEventsService();
  const findItems = useEventsFindItems();

  const dataSource = useMemo(() => ({ findItems, debounceMs: 0 }), [findItems]);

  const itemConfig = useMemo(
    () => ({
      onDelete: async (items: ContentListItem[]) => {
        await Promise.all(items.map((item) => events.delete(item.id)));
      },
    }),
    [events]
  );

  const handleMarkAsRead = useCallback(
    (item: NotificationStackItem) => {
      void events.markAsRead(item.id, !item.isRead);
    },
    [events]
  );

  const handleTogglePin = useCallback(
    (item: NotificationStackItem) => {
      if (item.isPinned) {
        void events.unpin(item.id);
      } else {
        void events.pin(item.id);
      }
    },
    [events]
  );

  return (
    <KibanaContentListPage data-test-subj="notificationStackManagementPage">
      <KibanaContentListPage.Header title={PAGE_TITLE} />
      <KibanaContentListPage.Section>
        <ContentListProvider
          id="notification-stack"
          queryKeyScope={NOTIFICATION_STACK_QUERY_KEY}
          labels={LABELS}
          dataSource={dataSource}
          item={itemConfig}
          features={FEATURES}
        >
          <ContentList>
            <ContentListToolbar>
              <Filters>
                <Filters.Sort />
              </Filters>
            </ContentListToolbar>
            <BulkActionsBar />
            <NotificationStackTable onMarkAsRead={handleMarkAsRead} onTogglePin={handleTogglePin} />
            <ContentListFooter />
          </ContentList>
        </ContentListProvider>
      </KibanaContentListPage.Section>
    </KibanaContentListPage>
  );
}
