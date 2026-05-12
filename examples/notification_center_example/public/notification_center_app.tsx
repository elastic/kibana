/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';
import { EuiButtonIcon, EuiEmptyPrompt, EuiSpacer, EuiTab, EuiTabs, EuiText } from '@elastic/eui';
import type { SidebarComponentProps } from '@kbn/core-chrome-sidebar';
import { SidebarHeader, SidebarBody } from '@kbn/core-chrome-sidebar-components';
import { NotificationEvent } from '@kbn/core-notifications-browser-components';
import {
  useNotificationEventsService,
  useNotifications,
  useReadNotifications,
  useUnreadNotifications,
} from '@kbn/core-notifications-browser-hooks';
import type { NotificationEvent as NotificationEventType } from '@kbn/core-notifications-browser';

export const notificationCenterAppId = 'sidebarExampleNotificationCenter';

type TabId = 'all' | 'unread' | 'read';

const formatTime = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleString();
};

export function NotificationCenterApp({ onClose }: SidebarComponentProps) {
  const events = useNotificationEventsService();
  const all = useNotifications();
  const unread = useUnreadNotifications();
  const read = useReadNotifications();

  const [tab, setTab] = useState<TabId>('all');

  const items = useMemo(() => {
    if (tab === 'unread') return unread;
    if (tab === 'read') return read;
    return all;
  }, [tab, all, unread, read]);

  const markAllAsRead = () => {
    unread.forEach((e) => events.markAsRead(e.id, true));
  };

  return (
    <>
      <SidebarHeader
        title="Notifications"
        onClose={onClose}
        actions={
          <EuiButtonIcon
            iconType="check"
            aria-label="Mark all as read"
            title="Mark all as read"
            isDisabled={unread.length === 0}
            onClick={markAllAsRead}
          />
        }
      />
      <SidebarBody>
        <EuiTabs size="s">
          <EuiTab isSelected={tab === 'all'} onClick={() => setTab('all')}>
            All ({all.length})
          </EuiTab>
          <EuiTab isSelected={tab === 'unread'} onClick={() => setTab('unread')}>
            Unread ({unread.length})
          </EuiTab>
          <EuiTab isSelected={tab === 'read'} onClick={() => setTab('read')}>
            Read ({read.length})
          </EuiTab>
        </EuiTabs>

        <EuiSpacer size="s" />

        {items.length === 0 ? (
          <EuiEmptyPrompt
            iconType="bell"
            titleSize="xs"
            title={<h3>No notifications</h3>}
            body={
              <EuiText size="s" color="subdued">
                <p>Publish events from the controller to see them appear here.</p>
              </EuiText>
            }
          />
        ) : (
          items.map((event: NotificationEventType) => (
            <NotificationEvent
              key={event.id}
              id={event.id}
              type={event.eventName}
              severity={event.severity}
              badgeColor={event.badgeColor}
              iconType={event.iconType}
              iconAriaLabel={event.eventName}
              time={formatTime(event.timestamp)}
              title={event.title}
              messages={[event.message]}
              isRead={event.isRead}
              onRead={(id, isRead) => events.markAsRead(id, !isRead)}
              isPinned={event.isPinned ?? false}
              onPin={(id, isPinned) => (isPinned ? events.unpin(id) : events.pin(id))}
            />
          ))
        )}
      </SidebarBody>
    </>
  );
}
