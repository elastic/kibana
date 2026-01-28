/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface ObjectParams {
  id: string;
  name: string;
  type: string;
  tags: string[];
}

// https://www.elastic.co/guide/en/ecs/1.12/ecs-allowed-values-event-type.html
type EventType =
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
  | 'indicator'
  | 'info'
  | 'installation'
  | 'protocol'
  | 'start'
  | 'user';

export interface EventParams {
  action: string;
  type: EventType;
}

export interface TrackUserActionParams {
  message?: string;
  event: EventParams;
  object: ObjectParams;
}

export interface UserActivityServiceSetup {
  trackUserAction(params: TrackUserActionParams): void;
}

export interface UserActivityServiceStart {
  trackUserAction(params: TrackUserActionParams): void;
}
