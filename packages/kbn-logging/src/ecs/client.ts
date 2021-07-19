/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EcsAutonomousSystem } from './autonomous_system';
import { EcsGeo } from './geo';
import { EcsNestedUser } from './user';

interface NestedFields {
  as?: EcsAutonomousSystem;
  geo?: EcsGeo;
  user?: EcsNestedUser;
}

/**
 * https://www.elastic.co/guide/en/ecs/1.9/ecs-client.html
 *
 * @internal
 */
export interface EcsClient extends NestedFields {
  address?: string;
  bytes?: number;
  domain?: string;
  ip?: string;
  mac?: string;
  nat?: { ip?: string; port?: number };
  packets?: number;
  port?: number;
  registered_domain?: string;
  subdomain?: string;
  top_level_domain?: string;
}
