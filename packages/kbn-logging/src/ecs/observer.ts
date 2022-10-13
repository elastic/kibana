/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EcsGeo } from './geo';
import { EcsInterface } from './interface';
import { EcsOs } from './os';
import { EcsVlan } from './vlan';

interface NestedFields {
  egress?: NestedEgressFields;
  geo?: EcsGeo;
  ingress?: NestedIngressFields;
  os?: EcsOs;
}

interface NestedEgressFields {
  interface?: EcsInterface;
  vlan?: EcsVlan;
}

interface NestedIngressFields {
  interface?: EcsInterface;
  vlan?: EcsVlan;
}

/**
 * https://www.elastic.co/guide/en/ecs/master/ecs-observer.html
 *
 * @internal
 */
export interface EcsObserver extends NestedFields {
  egress?: Egress;
  hostname?: string;
  ingress?: Ingress;
  ip?: string[];
  mac?: string[];
  name?: string;
  product?: string;
  serial_number?: string;
  type?: string;
  vendor?: string;
  version?: string;
}

interface Egress extends NestedEgressFields {
  zone?: string;
}

interface Ingress extends NestedIngressFields {
  zone?: string;
}
