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
export interface EcsEvent {
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
  client?: EcsClientField;
  http?: EcsHttpField;
  url?: EcsUrlField;
  user_agent?: EcsUserAgentField;
}

interface EcsClientField {
  ip?: string;
}

interface EcsHttpFieldRequest {
  body?: { bytes?: number; content?: string };
  method?: string;
  mime_type?: string;
  referrer?: string;
}

interface EcsHttpFieldResponse {
  body?: { bytes?: number; content?: string };
  bytes?: number;
  status_code?: number;
}

interface EcsHttpField {
  version?: string;
  request?: EcsHttpFieldRequest;
  response?: EcsHttpFieldResponse;
}

interface EcsUrlField {
  path?: string;
  query?: string;
}

interface EcsUserAgentField {
  original?: string;
}
