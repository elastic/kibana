/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * https://www.elastic.co/guide/en/ecs/1.9/ecs-agent.html
 *
 * @internal
 */
export interface EcsAgent {
  build?: { original: string };
  ephemeral_id?: string;
  id?: string;
  name?: string;
  type?: string;
  version?: string;
}
