/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  INotificationEvents,
  NotificationEventTypeData,
  TypedNotificationEvent,
} from '@kbn/core-notifications-browser';

export const reportTypeId = 'notification-center-example.report';
export const alertTypeId = 'notification-center-example.alert';
export const cloudTypeId = 'notification-center-example.cloud';

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

/**
 * Register the three demo notification types and return typed update callbacks.
 * The callbacks merge an updated event into the matching id (see EventsService).
 * Demo events are *published* via `events.notify(...)` from the controller app.
 */
export function registerDemoTypes(events: INotificationEvents) {
  return {
    updateReport: events.registerType<ReportMetadata>(reportTypeId, reportType),
    updateAlert: events.registerType<AlertMetadata>(alertTypeId, alertType),
    updateCloud: events.registerType<CloudMetadata>(cloudTypeId, cloudType),
  };
}

export type DemoUpdaters = ReturnType<typeof registerDemoTypes>;
export type { TypedNotificationEvent };
