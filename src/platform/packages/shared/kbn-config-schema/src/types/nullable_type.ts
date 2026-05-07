/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LiteralType } from './literal_type';
import type { Type } from './type';
import { UnionType } from './union_type';

/**
 * `T | null` with `defaultValue: null` so missing / `undefined` input resolves to `null`.
 * Structure label is `<T>?|null` (optional inner type, then null) for OAS-style helpers.
 */
export class NullableType<V> extends UnionType<[Type<V>, LiteralType<null>], V | null> {
  private readonly innerType: Type<V>;

  constructor(inner: Type<V>) {
    super([inner, new LiteralType(null)] as [Type<V>, LiteralType<null>], { defaultValue: null });
    this.innerType = inner;
  }

  protected structureTypeLabel(): string {
    return `${this.innerType.getStructureLabel()}?|null`;
  }
}
