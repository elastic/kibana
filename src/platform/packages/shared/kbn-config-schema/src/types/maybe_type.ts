/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { META_FIELD_X_OAS_OPTIONAL } from '../oas_meta_fields';
import type { DefaultValue, ExtendsDeepOptions } from './type';
import { Type } from './type';

export class MaybeType<V, D extends DefaultValue<V> = never> extends Type<V | undefined, D> {
  private readonly maybeType: Type<V, D>;

  constructor(type: Type<V, D>) {
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
