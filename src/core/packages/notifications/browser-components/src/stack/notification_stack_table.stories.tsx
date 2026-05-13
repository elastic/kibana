/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Storybook file for src/core/packages/notifications/browser-components/src/stack/notification_stack_table.tsx
 */

import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { action } from '@storybook/addon-actions';

import { ContentList, ContentListProvider, ContentListFooter } from '@kbn/content-list';
import {
  NotificationStackTable,
  type NotificationStackTableProps,
} from './notification_stack_table';
import type { NotificationStackItem } from './types';

// Extra synthetic args that control derived props in the template but are not
// passed directly to NotificationStackTable.
interface ExtraArgs {
  items: NotificationStackItem[];
}

type StoryArgs = NotificationStackTableProps & ExtraArgs;

const meta: Meta<StoryArgs> = {
  title: 'Notifications/Stack Table',
  component: NotificationStackTable as React.ComponentType<StoryArgs>,
  argTypes: {
    // ── Component props ───────────────────────────────────────────────────────
    onMarkAsRead: { action: 'markAsRead' },
    onTogglePin: { action: 'togglePin' },

    // ── Synthetic controls ────────────────────────────────────────────────────
  },
};

export default meta;

const LABELS = {
  entity: 'notification',
  entityPlural: 'notifications',
};

const FEATURES = {
  urlSync: false,
  sorting: {
    initialSort: { field: 'timestamp', direction: 'desc' as const },
  },
  pagination: { initialPageSize: 20 },
};

const ITEMS: NotificationStackItem[] = [
  {
    id: '1',
    eventName: 'user_registered',
    severity: 'info',
    title: 'New user registered',
    description: 'A new user has registered on your site.',
    timestamp: Date.now() - 1000 * 60 * 5, // 5 minutes ago
    isRead: false,
    isPinned: false,
  },
];

const Template: StoryFn<StoryArgs> = (args) => {
  const dataSource = {
    findItems: async () => {
      return { items: args.items, total: args.items.length };
    },
    debounceMs: 0,
  };

  const handleMarkAsRead = (item: NotificationStackItem) => {
    action('markAsRead')(item);
  };

  const handleTogglePin = (item: NotificationStackItem) => {
    action('togglePin')(item);
  };

  return (
    <ContentListProvider
      id="notification-stack"
      queryKeyScope="notification-stack-storybook"
      dataSource={dataSource}
      features={FEATURES}
      labels={LABELS}
    >
      <ContentList>
        <NotificationStackTable onMarkAsRead={handleMarkAsRead} onTogglePin={handleTogglePin} />
        <ContentListFooter />
      </ContentList>
    </ContentListProvider>
  );
};

export const Default = Template.bind({});
Default.args = {
  items: ITEMS,
};

export const EmptyState = Template.bind({});
EmptyState.args = {
  items: [],
};
