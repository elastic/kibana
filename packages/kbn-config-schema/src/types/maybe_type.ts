/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Type, ExtendsDeepOptions } from './type';

/**
 * Used to explicitly mark a field as optional in @kbn/config-schema.
 *
 * Especially for introspection on schemas when generating OAS.
 */
const META_FIELD_X_OAS_OPTIONAL = 'x-oas-optional';

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
