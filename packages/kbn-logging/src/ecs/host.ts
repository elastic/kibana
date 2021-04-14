/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EcsGeo } from './geo';
import { EcsOs } from './os';
import { EcsNestedUser } from './user';

interface NestedFields {
  geo?: EcsGeo;
  os?: EcsOs;
  /** @deprecated */
  user?: EcsNestedUser;
}

/**
 * https://www.elastic.co/guide/en/ecs/1.9/ecs-host.html
 *
 * @internal
 */
export interface EcsHost extends NestedFields {
  architecture?: string;
  cpu?: { usage: number };
  disk?: Disk;
  domain?: string;
  hostname?: string;
  id?: string;
  ip?: string[];
  mac?: string[];
  name?: string;
  network?: Network;
  type?: string;
  uptime?: number;
}

interface Disk {
  read?: { bytes: number };
  write?: { bytes: number };
}

interface Network {
  egress?: { bytes?: number; packets?: number };
  ingress?: { bytes?: number; packets?: number };
}
