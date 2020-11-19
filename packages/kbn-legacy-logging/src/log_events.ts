/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { EventData, isEventData } from './metadata';

export interface BaseEvent {
  event: string;
  timestamp: string;
  pid: string;
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
  pid: string;
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
