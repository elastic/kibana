/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as runtimeTypes from 'io-ts';
import type { ReactNode } from 'react';

// This type is for typing EuiDescriptionList
export interface DescriptionList {
  title: NonNullable<ReactNode>;
  description: NonNullable<ReactNode>;
}

export const unionWithNullType = <T extends runtimeTypes.Mixed>(type: T) =>
  runtimeTypes.union([type, runtimeTypes.null]);

export const stringEnum = <T>(enumObj: T, enumName = 'enum') =>
  new runtimeTypes.Type<T[keyof T], string>(
    enumName,
    (u): u is T[keyof T] => Object.values(enumObj).includes(u),
    (u, c) =>
      Object.values(enumObj).includes(u)
        ? runtimeTypes.success(u as T[keyof T])
        : runtimeTypes.failure(u, c),
    (a) => a as unknown as string
  );
