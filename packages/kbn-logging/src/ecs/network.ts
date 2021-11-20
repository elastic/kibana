/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EcsVlan } from './vlan';

interface NestedFields {
  inner?: { vlan?: EcsVlan };
  vlan?: EcsVlan;
}

/**
 * https://www.elastic.co/guide/en/ecs/master/ecs-network.html
 *
 * @internal
 */
export interface EcsNetwork extends NestedFields {
  application?: string;
  bytes?: number;
  community_id?: string;
  direction?: string;
  forwarded_ip?: string;
  iana_number?: string;
  name?: string;
  packets?: number;
  protocol?: string;
  transport?: string;
  type?: string;
}
