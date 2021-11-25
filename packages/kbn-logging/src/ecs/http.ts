/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * https://www.elastic.co/guide/en/ecs/master/ecs-http.html
 *
 * @internal
 */
export interface EcsHttp {
  request?: Request;
  response?: Response;
  version?: string;
}

interface Request {
  body?: { bytes?: number; content?: string };
  bytes?: number;
  id?: string;
  // We can't provide predefined values here because ECS requires preserving the
  // original casing for anomaly detection use cases.
  method?: string;
  mime_type?: string;
  referrer?: string;
}

interface Response {
  body?: { bytes?: number; content?: string };
  bytes?: number;
  mime_type?: string;
  status_code?: number;
}
