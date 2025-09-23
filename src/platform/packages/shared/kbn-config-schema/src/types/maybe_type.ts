/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { META_FIELD_X_OAS_OPTIONAL } from '../oas_meta_fields';
import type { DefaultValue, ExtendsDeepOptions, SomeType } from './type';
import { Type } from './type';

export class MaybeType<T extends SomeType> extends Type<
  T['_output'] | undefined,
  T['_input'] | undefined
> {
  private readonly maybeType: Type<T['_output'] | undefined, T['_input'] | undefined>;

  constructor(type: T) {
    super(
      type
        .getSchema()
        .optional()
        .meta({ [META_FIELD_X_OAS_OPTIONAL]: true })
        .default(() => undefined)
    );
    this.maybeType = type;
  }

  protected getDefault(
    defaultValue?: DefaultValue<T['_input']>
  ): DefaultValue<T['_input']> | undefined {
    return defaultValue;
  }

  public extendsDeep(
    options: ExtendsDeepOptions
  ): Type<T['_output'] | undefined, T['_input'] | undefined> {
    return new MaybeType(this.maybeType.extendsDeep(options));
  }
}
