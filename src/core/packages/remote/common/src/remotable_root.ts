/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { inject } from 'inversify';
import { createToken } from '@kbn/core-di';
import { remotable } from './remotable';
import type { RemotableDep } from './remotable_dep';

export const remotableDepToken = createToken<RemotableDep>('test.remote.dep');

/** Root that receives a remotable dependency through the container. */
@remotable()
export class RemotableRoot {
  constructor(@inject(remotableDepToken) private readonly dep: RemotableDep) {}

  ping(): string {
    return this.dep.ping();
  }
}
