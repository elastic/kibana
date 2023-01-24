/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EcsOs } from './os';

interface NestedFields {
  os?: EcsOs;
}

/**
 * https://www.elastic.co/guide/en/ecs/master/ecs-user_agent.html
 *
 * @internal
 */
export interface EcsUserAgent extends NestedFields {
  device?: { name: string };
  name?: string;
  original?: string;
  version?: string;
}
