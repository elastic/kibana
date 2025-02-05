/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TelemetryConfigLabels } from '../../server/config';

export interface Telemetry {
  /** Whether telemetry is enabled */
  enabled?: boolean | null;
  lastVersionChecked?: string;
  /** Whether to send usage from the server or browser. */
  sendUsageFrom?: 'browser' | 'server';
  lastReported?: number;
  allowChangingOptInStatus?: boolean;
  userHasSeenNotice?: boolean;
  reportFailureCount?: number;
  reportFailureVersion?: string;
}

export interface FetchTelemetryConfigResponse {
  allowChangingOptInStatus: boolean;
  optIn: boolean | null;
  sendUsageFrom: 'server' | 'browser';
  telemetryNotifyUserAboutOptInDefault: boolean;
  labels: TelemetryConfigLabels;
}

export interface FetchLastReportedResponse {
  lastReported: undefined | number;
}

export type UpdateLastReportedResponse = undefined;

export interface OptInStatsBody {
  enabled: boolean;
  /** @default true */
  unencrypted?: boolean;
}

export interface StatsPayload {
  cluster_uuid: string;
  opt_in_status: boolean;
}

export type OptInStatsResponse = Array<{
  clusterUuid: string;
  stats: StatsPayload;
}>;

export interface OptInBody {
  enabled: boolean;
}

export type OptInResponse = Array<{
  clusterUuid: string;
  stats: string;
}>;

export interface UsageStatsBody {
  /** @default false */
  unencrypted: boolean;
  /** @default false */
  refreshCache: boolean;
}

export type UseHasSeenNoticeResponse = Telemetry;

export type EncryptedTelemetryPayload = Array<{ clusterUuid: string; stats: string }>;

export type UnencryptedTelemetryPayload = Array<{ clusterUuid: string; stats: object }>;
