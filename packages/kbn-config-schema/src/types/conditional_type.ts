/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
