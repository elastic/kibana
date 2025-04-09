/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface WorkspaceNotification {
  id: string;
  message: string;
  display: 'info' | 'warning' | 'error';
  isUnread: boolean;
  isArchived: boolean;
  timestamp: number;
  groupId?: string;
}

export interface WorkspaceNofificationState {
  notifications: WorkspaceNotification[];
}

const initialNotificationState: WorkspaceNofificationState = {
  notifications: [],
};

export const notificationSlice = createSlice({
  name: 'notifications',
  initialState: initialNotificationState,
  reducers: {
    addNotification: (state, action: PayloadAction<WorkspaceNotification>) => {
      state.notifications.push(action.payload);
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        (notification) => notification.id !== action.payload
      );
    },
    markAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find((n) => n.id === action.payload);
      if (notification) {
        notification.isUnread = false;
      }
    },
    markAsArchived: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find((n) => n.id === action.payload);
      if (notification) {
        notification.isArchived = true;
      }
    },
  },
});

export const { addNotification, removeNotification, markAsRead, markAsArchived } =
  notificationSlice.actions;

export const notificationReducer = notificationSlice.reducer;
