/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '../references';

export interface TypeMetaAvailability {
  stability?: 'experimental' | 'beta' | 'stable';
  since?: string;
}

export interface TypeMeta {
  id?: string;
  title?: string;
  description?: string;
  deprecated?: boolean;
  'x-discontinued'?: string;
  availability?: TypeMetaAvailability;
}

/**
 * Callback parameter position is bivariant so literal-valued types (e.g. `Type<'foo'>`, `Type<false>`)
 * remain assignable where wider parameter types are declared — mirroring typical schema DSL ergonomics.
 */
export type TypeOptionsValidate<T> = {
  hack?(value: T): string | void;
}['hack'];

export interface TypeOptions<T> {
  defaultValue?: T | Reference<T> | (() => T);
  validate?: TypeOptionsValidate<T>;
  meta?: TypeMeta;
}

export interface SchemaStructureEntry {
  path: string[];
  type: string;
}

export interface SchemaValidationOptions {
  stripUnknownKeys?: boolean;
}

export type OptionsForUnknowns = 'allow' | 'ignore' | 'forbid';

export interface UnknownOptions {
  unknowns?: OptionsForUnknowns;
}

export interface ExtendsDeepOptions {
  unknowns?: OptionsForUnknowns;
}
