/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Type, ValidationError } from '@kbn/config-schema';

export type Version = number;

export type ObjectTransform<I extends object = any, O extends object = any> = (input: I) => O;

export interface VersionableObject<I extends object = any, O extends object = any> {
  schema?: Type<any>;
  down?: ObjectTransform;
  up?: ObjectTransform;
}

export interface ObjectMigrationDefinition {
  [version: Version]: VersionableObject;
}

export type TransformReturn<T = object> =
  | {
      value: T;
      error: null;
    }
  | {
      value: null;
      error: ValidationError | Error;
    };

export interface ObjectTransforms<Current = any, Previous = any, Next = any> {
  up: (
    obj: Current,
    version?: Version | 'latest',
    options?: {
      /** Validate the object _before_ up transform */
      validate?: boolean;
    }
  ) => TransformReturn<Next>;
  down: (
    obj: Current,
    version?: Version | 'latest',
    options?: {
      /** Validate the object _before_ down transform */
      validate?: boolean;
    }
  ) => TransformReturn<Previous>;
  validate: (obj: any, version?: Version) => ValidationError | null;
}
