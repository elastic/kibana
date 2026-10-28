/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import 'reflect-metadata';
import { injectable } from 'inversify';
import type { ServiceToken } from '@kbn/core-di';
import { remoteTokenId } from './token_id';

const REMOTABLE_INSTANCE = Symbol.for('kbn.remote.instance');

/**
 * Marks a class as injectable and as a value that may cross a remote boundary.
 * Authors do not extend `RpcTarget`; the host wraps instances when they are exposed.
 */
export function remotable(options?: { kind?: ServiceToken<unknown> }) {
  return function (target: new (...args: never[]) => object): void {
    injectable()(target);
    if (options?.kind) {
      Reflect.defineMetadata(REMOTABLE_INSTANCE, remoteTokenId(options.kind), target);
    }
    (target.prototype as Record<symbol, boolean>)[REMOTABLE_INSTANCE] = true;
  };
}

export function isRemotableInstance(value: unknown): value is object {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<symbol, unknown>)[REMOTABLE_INSTANCE] === true
  );
}
