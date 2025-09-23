/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import typeDetect from 'type-detect';
import { internals } from '../internals';
import { Reference } from '../references';
import type { DefaultValue, ExtendsDeepOptions, SomeType, TypeOptions } from './type';
import { Type } from './type';

export type ConditionalTypeValue = string | number | boolean | object | null;

export type ConditionalTypeOptions<
  A extends SomeType,
  B extends SomeType,
  D extends DefaultValue<A['_input'] | B['_input']> = never
> = TypeOptions<A['_output'] | B['_output'], A['_input'] | B['_input'] | B, D>;

export class ConditionalType<
  T extends ConditionalTypeValue,
  A extends SomeType,
  B extends SomeType,
  D extends DefaultValue<A['_input'] | B['_input']> = never
> extends Type<A['_output'] | B['_output'], A['_input'] | B['_input'], D> {
  private readonly leftOperand: Reference<T>;
  private readonly rightOperand: Reference<T> | T | Type<unknown>;
  private readonly equalType: A;
  private readonly notEqualType: B;
  private readonly options?: ConditionalTypeOptions<A, B, D>;

  constructor(
    leftOperand: Reference<T>,
    rightOperand: Reference<T> | T | Type<unknown>,
    equalType: A,
    notEqualType: B,
    options?: ConditionalTypeOptions<A, B, D>
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

    this.leftOperand = leftOperand;
    this.rightOperand = rightOperand;
    this.equalType = equalType;
    this.notEqualType = notEqualType;
    this.options = options;
  }

  public extendsDeep(options: ExtendsDeepOptions) {
    return new ConditionalType(
      this.leftOperand,
      this.rightOperand,
      this.equalType.extendsDeep(options),
      this.notEqualType.extendsDeep(options),
      this.options
    );
  }

  protected handleError(type: string, { value }: Record<string, any>) {
    if (type === 'any.required') {
      return `expected at least one defined value but got [${typeDetect(value)}]`;
    }
  }
}
