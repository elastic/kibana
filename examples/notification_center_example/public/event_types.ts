/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type {
  INotificationEvents,
  NotificationEventTypeData,
} from '@kbn/core-notifications-browser';

// Allowlist-conforming typeIds (NotificationTypeId prefix carve-out for examples).
export const reportTypeId = 'notificationExampleReport' as const;
export const alertTypeId = 'notificationExampleAlert' as const;
export const cloudTypeId = 'notificationExampleCloud' as const;

export interface ReportMetadata {
  format: 'pdf' | 'csv';
}
export interface AlertMetadata {
  rule: string;
}
export interface CloudMetadata {
  region: string;
}

export const reportType: NotificationEventTypeData = {
  severity: 'info',
  iconType: 'reportingApp',
  badgeColor: 'primary',
  eventName: 'demo-report',
};

export const alertType: NotificationEventTypeData = {
  severity: 'critical',
  iconType: 'warning',
  badgeColor: 'danger',
  eventName: 'demo-alert',
};

export const cloudType: NotificationEventTypeData = {
  severity: 'info',
  iconType: 'logoCloud',
  badgeColor: 'success',
  eventName: 'demo-cloud',
};

const REPORT_PRIMARY_ACTION_LABEL = i18n.translate(
  'notificationEventsExample.reportPrimaryAction',
  { defaultMessage: 'Download report' }
);

function alertDemoReportAction(event: {
  id: string;
  title: string;
  metadata?: ReportMetadata;
}): void {
  const format = event.metadata?.format;
  window.alert(
    `[${reportTypeId}] "${event.title}" (id: ${event.id})${
      format !== undefined ? `, format: ${format}` : ''
    }`
  );
}

/**
 * Register the three demo notification types and return typed update callbacks.
 * The callbacks merge an updated event into the matching id (see EventsService).
 * Demo events are *published* via `events.notify(...)` from the controller app.
 *
 * Primary action for report events is registered here, co-located with the type
 * definition. Alert and cloud types have no primary action.
 */
export function registerDemoTypes(events: INotificationEvents) {
  return {
    updateReport: events.registerType<ReportMetadata>(
      reportTypeId,
      reportType,
      undefined,
      (event) => ({
        label: REPORT_PRIMARY_ACTION_LABEL,
        onClick: () => alertDemoReportAction(event),
      })
    ),
    updateAlert: events.registerType<AlertMetadata>(alertTypeId, alertType),
    updateCloud: events.registerType<CloudMetadata>(cloudTypeId, cloudType),
  };
}

export type DemoUpdaters = ReturnType<typeof registerDemoTypes>;
export type { TypedNotificationEvent } from '@kbn/core-notifications-browser';
