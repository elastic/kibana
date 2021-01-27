/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import typeDetect from 'type-detect';
import { internals } from '../internals';
import { Reference } from '../references';
import { Type, TypeOptions } from './type';

export type ConditionalTypeValue = string | number | boolean | object | null;

export class ConditionalType<A extends ConditionalTypeValue, B, C> extends Type<B | C> {
  constructor(
    leftOperand: Reference<A>,
    rightOperand: Reference<A> | A | Type<unknown>,
    equalType: Type<B>,
    notEqualType: Type<C>,
    options?: TypeOptions<B | C>
  ) {
    const schema = internals.when(leftOperand.getSchema(), {
      is:
        Reference.isReference(rightOperand) || rightOperand instanceof Type
          ? rightOperand.getSchema()
          : rightOperand,
      then: equalType.getSchema(),
      otherwise: notEqualType.getSchema(),
    });

    super(schema, options);
  }

  protected handleError(type: string, { value }: Record<string, any>) {
    if (type === 'any.required') {
      return `expected at least one defined value but got [${typeDetect(value)}]`;
    }
  }
}
