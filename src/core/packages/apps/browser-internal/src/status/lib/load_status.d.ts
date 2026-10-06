/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type { NotificationsSetup } from '@kbn/core-notifications-browser';
import type {
  ServerVersion,
  ServiceStatusLevelId,
  StatusInfoServiceStatus as ServiceStatus,
} from '@kbn/core-status-common';
import type { DataType } from './format_number';
interface MetricMeta {
  title: string;
  description: string;
  value?: number[];
  type?: DataType;
}
export interface Metric {
  name: string;
  value: number | number[];
  type?: DataType;
  meta?: MetricMeta;
}
export interface FormattedStatus {
  id: string;
  state: StatusState;
  original: ServiceStatus;
}
export interface StatusState {
  id: ServiceStatusLevelId;
  title: string;
  message: string;
  uiColor: string;
}
interface StatusUIAttributes {
  title: string;
  uiColor: string;
}
/**
 * Maps status to health color for frontend views
 */
export declare const STATUS_LEVEL_UI_ATTRS: Record<ServiceStatusLevelId, StatusUIAttributes>;
export type ProcessedServerResponse =
  | {
      redacted: true;
      serverState: StatusState;
    }
  | {
      redacted: false;
      name: string;
      version: ServerVersion;
      coreStatus: FormattedStatus[];
      pluginStatus: FormattedStatus[];
      serverState: StatusState;
      metrics: Metric[];
    };
/**
 * Get the status from the server API and format it for display.
 */
export declare function loadStatus({
  http,
  notifications,
}: {
  http: Pick<HttpSetup, 'get'>;
  notifications: NotificationsSetup;
}): Promise<ProcessedServerResponse>;
export {};
