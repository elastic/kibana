/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * https://www.elastic.co/guide/en/ecs/1.9/ecs-cloud.html
 *
 * @internal
 */
export interface EcsCloud {
  account?: { id?: string; name?: string };
  availability_zone?: string;
  instance?: { id?: string; name?: string };
  machine?: { type: string };
  project?: { id?: string; name?: string };
  provider?: string;
  region?: string;
  service?: { name: string };
}
