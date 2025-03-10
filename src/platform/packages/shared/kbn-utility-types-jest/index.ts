/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type DeeplyMockedKeys<T> = {
  [P in keyof T]: T[P] extends readonly any[]
    ? ReadonlyArray<DeeplyMockedKeys<T[P][0]>>
    : T[P] extends (...args: any[]) => any
    ? jest.MockInstance<ReturnType<T[P]>, Parameters<T[P]>>
    : T[P] extends object
    ? DeeplyMockedKeys<T[P]>
    : T[P];
} & T;

export type MockedKeys<T> = { [P in keyof T]: jest.Mocked<T[P]> };
