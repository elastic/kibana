/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { EventData, isEventData } from './metadata';

export interface BaseEvent {
  event: string;
  timestamp: number;
  pid: number;
  tags?: string[];
}

export interface ResponseEvent extends BaseEvent {
  event: 'response';
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  statusCode: number;
  path: string;
  headers: Record<string, string | string[]>;
  responsePayload: string;
  responseTime: string;
  query: Record<string, any>;
}

export interface OpsEvent extends BaseEvent {
  event: 'ops';
  os: {
    load: string[];
  };
  proc: Record<string, any>;
  load: string;
}

export interface ErrorEvent extends BaseEvent {
  event: 'error';
  error: Error;
  url: string;
}

export interface UndeclaredErrorEvent extends BaseEvent {
  error: Error;
}

export interface LogEvent extends BaseEvent {
  data: EventData;
}

export interface UnkownEvent extends BaseEvent {
  data: string | Record<string, any>;
}

export type AnyEvent =
  | ResponseEvent
  | OpsEvent
  | ErrorEvent
  | UndeclaredErrorEvent
  | LogEvent
  | UnkownEvent;

export const isResponseEvent = (e: AnyEvent): e is ResponseEvent => e.event === 'response';
export const isOpsEvent = (e: AnyEvent): e is OpsEvent => e.event === 'ops';
export const isErrorEvent = (e: AnyEvent): e is ErrorEvent => e.event === 'error';
export const isLogEvent = (e: AnyEvent): e is LogEvent => isEventData((e as LogEvent).data);
export const isUndeclaredErrorEvent = (e: AnyEvent): e is UndeclaredErrorEvent =>
  (e as any).error instanceof Error;
