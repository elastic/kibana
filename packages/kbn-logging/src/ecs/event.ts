/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * @internal
 */
export interface EcsEvent {
  action?: string;
  category?: Category[];
  code?: string;
  created?: string;
  dataset?: string;
  duration?: number;
  end?: string;
  hash?: string;
  id?: string;
  ingested?: string;
  kind?: Kind;
  module?: string;
  original?: string;
  outcome?: Outcome;
  provider?: string;
  reason?: string;
  reference?: string;
  risk_score?: number;
  risk_score_norm?: number;
  sequence?: number;
  severity?: number;
  start?: string;
  timezone?: string;
  type?: Type[];
  url?: string;
}

type Category =
  | 'authentication'
  | 'configuration'
  | 'database'
  | 'driver'
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

type Kind = 'alert' | 'event' | 'metric' | 'state' | 'pipeline_error' | 'signal';

type Outcome = 'failure' | 'success' | 'unknown';

type Type =
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
