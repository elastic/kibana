/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Type, ValidationError } from '@kbn/config-schema';

export type Version = number;

export type ObjectTransform<I = unknown, O = unknown> = (input: I) => O;

export interface VersionableObject<
  UpIn = unknown,
  UpOut = unknown,
  DownIn = unknown,
  DownOut = unknown
> {
  schema?: Type<any>;
  down?: ObjectTransform<DownIn, DownOut>;
  up?: ObjectTransform<UpIn, UpOut>;
}

export interface ObjectMigrationDefinition {
  [version: Version]: VersionableObject<any, any, any, any>;
}

export type TransformReturn<T = unknown> =
  | {
      value: T;
      error: null;
    }
  | {
      value: null;
      error: ValidationError | Error;
    };

export interface ObjectTransforms<
  UpIn = unknown,
  UpOut = unknown,
  DownIn = unknown,
  DownOut = unknown
> {
  up: <I = UpIn, O = UpOut>(
    obj: I,
    version?: Version | 'latest',
    options?: {
      /** Validate the object _before_ up transform */
      validate?: boolean;
    }
  ) => TransformReturn<O>;
  down: <I = DownIn, O = DownOut>(
    obj: DownIn,
    version?: Version | 'latest',
    options?: {
      /** Validate the object _before_ down transform */
      validate?: boolean;
    }
  ) => TransformReturn<O>;
  validate: (obj: any, version?: Version) => ValidationError | null;
}
