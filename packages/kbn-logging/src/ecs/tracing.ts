/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Unlike other ECS field sets, tracing fields are not nested under the field
 * set name (i.e. `trace.id` is valid, `tracing.trace.id` is not). So, like
 * the base fields, we will need to do an intersection with these types at
 * the root level.
 *
 * https://www.elastic.co/guide/en/ecs/master/ecs-tracing.html
 *
 * @internal
 */
export interface EcsTracing {
  span?: { id?: string };
  trace?: { id?: string };
  transaction?: { id?: string };
}
