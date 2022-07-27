/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * https://www.elastic.co/guide/en/ecs/master/ecs-event.html
 *
 * @internal
 */
export interface EcsEvent {
  action?: string;
  agent_id_status?: 'verified' | 'mismatch' | 'missing' | 'auth_metadata_missing';
  category?: EcsEventCategory[];
  code?: string;
  created?: string;
  dataset?: string;
  duration?: number;
  end?: string;
  hash?: string;
  id?: string;
  ingested?: string;
  kind?: EcsEventKind;
  module?: string;
  original?: string;
  outcome?: EcsEventOutcome;
  provider?: string;
  reason?: string;
  reference?: string;
  risk_score?: number;
  risk_score_norm?: number;
  sequence?: number;
  severity?: number;
  start?: string;
  timezone?: string;
  type?: EcsEventType[];
  url?: string;
}

/**
 * @public
 */
export type EcsEventCategory =
  | 'authentication'
  | 'configuration'
  | 'database'
  | 'driver'
  | 'email'
  | 'file'
  | 'host'
  | 'iam'
  | 'intrusion_detection'
  | 'malware'
  | 'network'
  | 'package'
  | 'process'
  | 'registry'
  | 'session'
  | 'web';

/**
 * @public
 */
export type EcsEventKind = 'alert' | 'event' | 'metric' | 'state' | 'pipeline_error' | 'signal';

/**
 * @public
 */
export type EcsEventOutcome = 'failure' | 'success' | 'unknown';

/**
 * @public
 */
export type EcsEventType =
  | 'access'
  | 'admin'
  | 'allowed'
  | 'change'
  | 'connection'
  | 'creation'
  | 'deletion'
  | 'denied'
  | 'end'
  | 'error'
  | 'group'
  | 'info'
  | 'installation'
  | 'protocol'
  | 'start'
  | 'user';
