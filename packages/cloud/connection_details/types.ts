/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApiKey } from './tabs/api_keys_tab/views/success_form/types';

export interface ConnectionDetailsOpts {
  links?: ConnectionDetailsOptsLinks;
  endpoints?: ConnectionDetailsOptsEndpoints;
  apiKeys?: ConnectionDetailsOptsApiKeys;
  navigateToUrl?: (url: string) => void;
  onTelemetryEvent?: (event: ConnectionDetailsTelemetryEvents) => void;
}

export interface ConnectionDetailsOptsLinks {
  learnMore?: string;
}

export interface ConnectionDetailsOptsEndpoints {
  url?: string;
  id?: string;
  cloudIdLearMoreLink?: string;
}

export interface ConnectionDetailsOptsApiKeys {
  manageKeysLink?: string;
  createKey: (params: { name: string }) => Promise<{
    apiKey: ApiKey;
  }>;
  hasPermission: () => Promise<boolean>;
}

export type ConnectionDetailsTelemetryEvent<EventId extends string, EventPayload = void> = [
  id: EventId,
  payload?: EventPayload
];

export type ConnectionDetailsTelemetryEvents =
  | ConnectionDetailsTelemetryEvent<'learn_more_clicked'>
  | ConnectionDetailsTelemetryEvent<'tab_switched', { tab: string }>
  | ConnectionDetailsTelemetryEvent<'copy_endpoint_url_clicked'>
  | ConnectionDetailsTelemetryEvent<'show_cloud_id_toggled'>
  | ConnectionDetailsTelemetryEvent<'copy_cloud_id_clicked'>
  | ConnectionDetailsTelemetryEvent<'new_api_key_created'>
  | ConnectionDetailsTelemetryEvent<'manage_api_keys_clicked'>
  | ConnectionDetailsTelemetryEvent<'key_encoding_changed', { format: string }>
  | ConnectionDetailsTelemetryEvent<'copy_api_key_clicked', { format: string }>;

export type TabID = 'endpoints' | 'apiKeys';
