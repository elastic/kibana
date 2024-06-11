/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Type, ExtendsDeepOptions } from './type';

import { META_FIELD_X_OAS_OPTIONAL } from '../oas_meta_fields';
export class MaybeType<V, R> extends Type<V | undefined, R | undefined> {
  private readonly maybeType: Type<V, R>;

  constructor(type: Type<V, R>) {
    super(
      type
        .getSchema()
        .optional()
        .meta({ [META_FIELD_X_OAS_OPTIONAL]: true })
        .default(() => undefined)
    );
    this.maybeType = type;
  }

  public extendsDeep(options: ExtendsDeepOptions) {
    return new MaybeType<V, R>(this.maybeType.extendsDeep(options));
  }
}
