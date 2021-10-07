/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * https://www.elastic.co/guide/en/ecs/master/ecs-service.html
 *
 * @internal
 */
export interface EcsService {
  address?: string;
  environment?: string;
  ephemeral_id?: string;
  id?: string;
  name?: string;
  node?: { name: string };
  state?: string;
  type?: string;
  version?: string;
}
