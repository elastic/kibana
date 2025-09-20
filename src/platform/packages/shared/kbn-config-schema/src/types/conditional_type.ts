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
import type { DefaultValue, ExtendsDeepOptions, TypeOptions } from './type';
import { Type } from './type';

export type ConditionalTypeValue = string | number | boolean | object | null;

export class ConditionalType<
  A extends ConditionalTypeValue,
  B,
  C,
  BDV extends DefaultValue<B>,
  CDV extends DefaultValue<C>,
  DV extends DefaultValue<B | C>
> extends Type<B | C, B | C, DV> {
  private readonly leftOperand: Reference<A>;
  private readonly rightOperand: Reference<A> | A | Type<unknown>;
  private readonly equalType: Type<B, B, BDV>;
  private readonly notEqualType: Type<C, C, CDV>;
  private readonly options?: TypeOptions<B | C, B | C, DV>;

  constructor(
    leftOperand: Reference<A>,
    rightOperand: Reference<A> | A | Type<unknown>,
    equalType: Type<B, B, BDV>,
    notEqualType: Type<C, C, CDV>,
    options?: TypeOptions<B | C, B | C, DV>
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
