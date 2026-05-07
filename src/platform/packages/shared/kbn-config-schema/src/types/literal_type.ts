/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z as zod } from '@kbn/zod';

import { Type } from './type';

export class LiteralType<T> extends Type<T> {
  public readonly expectedValue: T;

  constructor(value: T) {
    super(zod.literal(value as any), {});
    this.expectedValue = value;
  }

  protected structureTypeLabel(): string {
    return String(this.expectedValue);
  }

  protected handleError(_type: string) {
    return `expected value to equal [${this.expectedValue}]`;
  }
}
