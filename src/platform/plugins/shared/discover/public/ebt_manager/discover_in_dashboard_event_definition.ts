/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EventTypeOpts } from '@elastic/ebt/client';

export const DISCOVER_IN_DASHBOARD_EVENT_TYPE = 'discover_in_dashboard';

export enum DiscoverInDashboardEventName {
  savedSession = 'savedSession',
  tabSwitched = 'tabSwitched',
}

export enum DiscoverInDashboardEventDataKeys {
  EVENT_NAME = 'eventName',
  DASHBOARD_ID = 'dashboardId',
  EMBEDDABLE_PANEL_ID = 'embeddablePanelId',
  SAVED_SESSION_ID = 'savedSessionId',
  TAB_SWITCHED_FROM_ID = 'tabSwitchedFromId',
  TAB_SWITCHED_TO_ID = 'tabSwitchedToId',
}

export interface DiscoverInDashboardEBTEvent {
  [DiscoverInDashboardEventDataKeys.EVENT_NAME]: DiscoverInDashboardEventName;
  [DiscoverInDashboardEventDataKeys.DASHBOARD_ID]?: string;
  [DiscoverInDashboardEventDataKeys.EMBEDDABLE_PANEL_ID]?: string;
  [DiscoverInDashboardEventDataKeys.SAVED_SESSION_ID]?: string;
  [DiscoverInDashboardEventDataKeys.TAB_SWITCHED_FROM_ID]?: string;
  [DiscoverInDashboardEventDataKeys.TAB_SWITCHED_TO_ID]?: string;
}

export const discoverInDashboardEventType: EventTypeOpts<Record<string, unknown>> = {
  eventType: DISCOVER_IN_DASHBOARD_EVENT_TYPE,
  schema: {
    [DiscoverInDashboardEventDataKeys.EVENT_NAME]: {
      type: 'keyword',
      _meta: {
        description: 'The event name. Expected values: savedSession, tabSwitched',
      },
    },
    [DiscoverInDashboardEventDataKeys.DASHBOARD_ID]: {
      type: 'keyword',
      _meta: {
        description: 'The unique dashboard identifier',
        optional: true,
      },
    },
    [DiscoverInDashboardEventDataKeys.EMBEDDABLE_PANEL_ID]: {
      type: 'keyword',
      _meta: {
        description: 'The embeddable panel instance identifier within the dashboard',
        optional: true,
      },
    },
    [DiscoverInDashboardEventDataKeys.SAVED_SESSION_ID]: {
      type: 'keyword',
      _meta: {
        description: 'The discover session identifier (present for savedSession)',
        optional: true,
      },
    },
    [DiscoverInDashboardEventDataKeys.TAB_SWITCHED_FROM_ID]: {
      type: 'keyword',
      _meta: {
        description: 'Tab identifier switched from (present for tabSwitched)',
        optional: true,
      },
    },
    [DiscoverInDashboardEventDataKeys.TAB_SWITCHED_TO_ID]: {
      type: 'keyword',
      _meta: {
        description: 'Tab identifier switched to (present for tabSwitched)',
        optional: true,
      },
    },
  },
};
