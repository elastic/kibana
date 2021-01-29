/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { internals } from '../internals';
import { Type } from './type';

export class LiteralType<T> extends Type<T> {
  constructor(value: T) {
    super(internals.any().valid(value));
  }

  protected handleError(type: string, { value, valids: [expectedValue] }: Record<string, any>) {
    switch (type) {
      case 'any.required':
      case 'any.allowOnly':
        return `expected value to equal [${expectedValue}]`;
    }
  }
}
