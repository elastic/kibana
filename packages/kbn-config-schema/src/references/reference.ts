/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference as InternalReference } from 'joi';
import { internals } from '../internals';

export class Reference<T> {
  public static isReference<V>(value: V | Reference<V> | undefined): value is Reference<V> {
    return (
      value != null &&
      typeof (value as Reference<V>).getSchema === 'function' &&
      internals.isRef((value as Reference<V>).getSchema())
    );
  }

  private readonly internalSchema: InternalReference;

  constructor(key: string) {
    this.internalSchema = internals.ref(key);
  }

  public getSchema() {
    return this.internalSchema;
  }
}
