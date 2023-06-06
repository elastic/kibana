/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Type, ExtendsDeepOptions } from './type';

export class MaybeType<V> extends Type<V | undefined> {
  private readonly maybeType: Type<V>;

  constructor(type: Type<V>) {
    super(
      type
        .getSchema()
        .optional()
        .default(() => undefined)
    );
    this.maybeType = type;
  }

  public extendsDeep(options: ExtendsDeepOptions) {
    return new MaybeType(this.maybeType.extendsDeep(options));
  }
}
