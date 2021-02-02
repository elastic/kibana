/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/**
 * Typings for some ECS fields which core uses internally.
 * These are not a complete set of ECS typings and should not
 * be used externally; the only types included here are ones
 * currently used in core.
 *
 * @internal
 */

export interface EcsOpsMetricsEvent {
  /**
   * These typings were written as of ECS 1.7.0.
   * Don't change this value without checking the rest
   * of the types to conform to that ECS version.
   *
   * https://www.elastic.co/guide/en/ecs/1.7/index.html
   */
  ecs: { version: '1.7.0' };

  // base fields
  ['@timestamp']?: string;
  labels?: Record<string, unknown>;
  message?: string;
  tags?: string[];
  // other fields
  process?: EcsProcessField;
  event?: EcsEventField;
}

interface EcsProcessField {
  uptime?: number;
}

export interface EcsEventField {
  kind?: EcsEventKind;
  category?: EcsEventCategory[];
  type?: EcsEventType;
}

export enum EcsEventKind {
  ALERT = 'alert',
  EVENT = 'event',
  METRIC = 'metric',
  STATE = 'state',
  PIPELINE_ERROR = 'pipeline_error',
  SIGNAL = 'signal',
}

export enum EcsEventCategory {
  AUTHENTICATION = 'authentication',
  CONFIGURATION = 'configuration',
  DATABASE = 'database',
  DRIVER = 'driver',
  FILE = 'file',
  HOST = 'host',
  IAM = 'iam',
  INTRUSION_DETECTION = 'intrusion_detection',
  MALWARE = 'malware',
  NETWORK = 'network',
  PACKAGE = 'package',
  PROCESS = 'process',
  WEB = 'web',
}

export enum EcsEventType {
  ACCESS = 'access',
  ADMIN = 'admin',
  ALLOWED = 'allowed',
  CHANGE = 'change',
  CONNECTION = 'connection',
  CREATION = 'creation',
  DELETION = 'deletion',
  DENIED = 'denied',
  END = 'end',
  ERROR = 'error',
  GROUP = 'group',
  INFO = 'info',
  INSTALLATION = 'installation',
  PROTOCOL = 'protocol',
  START = 'start',
  USER = 'user',
}
