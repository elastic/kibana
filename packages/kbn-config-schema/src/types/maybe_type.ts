/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Type, ExtendsDeepOptions } from './type';

import { META_FIELD_X_OAS_OPTIONAL } from '../oas_meta_fields';
export class MaybeType<V> extends Type<V | undefined> {
  private readonly maybeType: Type<V>;

  constructor(type: Type<V>) {
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
    return new MaybeType(this.maybeType.extendsDeep(options));
  }
}
