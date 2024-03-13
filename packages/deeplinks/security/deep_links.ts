/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const SECURITY_APP_ID = 'securitySolutionUI';

export type AppId = typeof SECURITY_APP_ID;

export type LinkId =
  | 'dashboards'
  | 'rules-landing'
  | 'alerts'
  | 'cloud_security_posture-findings'
  | 'cases'
  | 'cases_create'
  | 'cases_configure'
  | 'timelines'
  | 'timelines-templates'
  | 'threat_intelligence'
  | 'explore'
  | 'network-dns'
  | 'network-http'
  | 'network-tls'
  | 'network-anomalies'
  | 'network-events'
  | 'policy'
  | 'trusted_apps'
  | 'event_filters'
  | 'host_isolation_exceptions'
  | 'blocklist'
  | 'response_actions_history'
  | 'cloud_defend-policies'
  | 'get_started'
  | 'uncommon_processes'
  | 'hosts-anomalies'
  | 'hosts-events'
  | 'hosts-risk'
  | 'sessions'
  | 'users-authentications'
  | 'users-anomalies'
  | 'users-risk'
  | 'users-events';

export type DeepLinkId = AppId | `${AppId}:${LinkId}`;
