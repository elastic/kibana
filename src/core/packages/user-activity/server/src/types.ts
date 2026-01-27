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

export interface EventParams {
  action: string;
  // type should be a fixed list of possibilities, not any string, we should fix that later
  type: string;
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
