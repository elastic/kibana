/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useWorkspaceSelector } from '../store';
import { WorkspaceNotification } from './slice';

export const useNotificationsState = () => useWorkspaceSelector((state) => state.notifications);
export const useNotifications = () =>
  useWorkspaceSelector((state) => state.notifications.notifications);
export const useArchivedNotifications = () =>
  useWorkspaceSelector((state) => state.notifications.notifications.filter((n) => n.isArchived));
export const useReadNotifications = () =>
  useWorkspaceSelector((state) => state.notifications.notifications.filter((n) => !n.isUnread));
export const useUnreadNotifications = () =>
  useWorkspaceSelector((state) => state.notifications.notifications.filter((n) => n.isUnread));
export const useUnreadNotificationCount = () => useUnreadNotifications().length;
export const useGroupedNotifications = (notifications: WorkspaceNotification[]) => {
  const groupedNotifications = notifications.reduce((acc, notification) => {
    if (notification.groupId) {
      if (!acc[notification.groupId]) {
        acc[notification.groupId] = [];
      }
      acc[notification.groupId].push(notification);
    } else {
      acc.ungrouped = acc.ungrouped || [];
      acc.ungrouped.push(notification);
    }
    return acc;
  }, {} as Record<string, WorkspaceNotification[]>);

  return groupedNotifications;
};
