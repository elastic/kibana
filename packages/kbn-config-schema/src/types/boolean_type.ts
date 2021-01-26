/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import typeDetect from 'type-detect';
import { internals } from '../internals';
import { Type, TypeOptions } from './type';

export class BooleanType extends Type<boolean> {
  constructor(options?: TypeOptions<boolean>) {
    super(internals.boolean(), options);
  }

  protected handleError(type: string, { value }: Record<string, any>) {
    if (type === 'any.required' || type === 'boolean.base') {
      return `expected value of type [boolean] but got [${typeDetect(value)}]`;
    }
  }
}
