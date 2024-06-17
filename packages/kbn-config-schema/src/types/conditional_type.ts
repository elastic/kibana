/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import typeDetect from 'type-detect';
import { internals } from '../internals';
import { Reference } from '../references';
import { ExtendsDeepOptions, Type, TypeOptions } from './type';

export type ConditionalTypeValue = string | number | boolean | object | null;

export class ConditionalType<A extends ConditionalTypeValue, B, BR, C, CR> extends Type<
  B | C,
  BR | CR
> {
  private readonly leftOperand: Reference<A>;
  private readonly rightOperand: Reference<A> | A | Type<unknown>;
  private readonly equalType: Type<B, BR>;
  private readonly notEqualType: Type<C, CR>;
  private readonly options?: TypeOptions<B | C>;

  constructor(
    leftOperand: Reference<A>,
    rightOperand: Reference<A> | A | Type<unknown>,
    equalType: Type<B, BR>,
    notEqualType: Type<C, CR>,
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
