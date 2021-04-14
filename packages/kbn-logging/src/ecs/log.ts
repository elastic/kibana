/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * https://www.elastic.co/guide/en/ecs/1.9/ecs-log.html
 *
 * @internal
 */
export interface EcsLog {
  file?: { path: string };
  level?: string;
  logger?: string;
  origin?: Origin;
  original?: string;
  syslog?: Syslog;
}

interface Origin {
  file?: { line?: number; name?: string };
  function?: string;
}

interface Syslog {
  facility?: { code?: number; name?: string };
  priority?: number;
  severity?: { code?: number; name?: string };
}
