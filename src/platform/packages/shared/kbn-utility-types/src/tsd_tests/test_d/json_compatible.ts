/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expectAssignable, expectNotAssignable } from 'tsd';
import type { JsonCompatible, JsonObject } from '../../..';

// `T extends JsonCompatible<T>` holds exactly when a `T` value is assignable to `JsonCompatible<T>`.
declare const value: <T>() => T;

interface Inner {
  sku: string;
  qty: number;
  note?: string;
}

interface Data {
  source: 'http' | 'timer';
  message: string;
  tags: string[];
  items: Inner[];
  inner: Inner;
  nullable: string | null;
  flags: Array<string | null>;
  readonly ro: readonly number[];
  tuple: [string, number];
  deep: { deeper: { deepest: string[] } };
  optional?: number;
}

interface Alias {
  a: string;
  b?: number;
}

class DataOnly {
  constructor(public readonly a: string) {}
}

interface WithMethod {
  a: string;
  format(): string;
}

// Accepted: interfaces, aliases, nested interfaces, optional properties, arrays, tuples.
expectAssignable<JsonCompatible<Data>>(value<Data>());
expectAssignable<JsonCompatible<Alias>>(value<Alias>());
expectAssignable<JsonCompatible<Inner>>(value<Inner>());
expectAssignable<JsonCompatible<JsonObject>>(value<JsonObject>());
expectAssignable<JsonCompatible<Record<string, string>>>(value<Record<string, string>>());
expectAssignable<JsonCompatible<string[]>>(value<string[]>());
expectAssignable<JsonCompatible<DataOnly>>(value<DataOnly>());

// Rejected: values that do not survive a JSON round trip.
expectNotAssignable<JsonCompatible<{ at: Date }>>(value<{ at: Date }>());
expectNotAssignable<JsonCompatible<{ nested: { at: Date } }>>(value<{ nested: { at: Date } }>());
expectNotAssignable<JsonCompatible<{ list: Date[] }>>(value<{ list: Date[] }>());
expectNotAssignable<JsonCompatible<{ m: Map<string, string> }>>(
  value<{ m: Map<string, string> }>()
);
expectNotAssignable<JsonCompatible<{ s: Set<string> }>>(value<{ s: Set<string> }>());
expectNotAssignable<JsonCompatible<{ fn: () => void }>>(value<{ fn: () => void }>());
expectNotAssignable<JsonCompatible<{ big: bigint }>>(value<{ big: bigint }>());
expectNotAssignable<JsonCompatible<{ sym: symbol }>>(value<{ sym: symbol }>());
expectNotAssignable<JsonCompatible<{ instance: WithMethod }>>(value<{ instance: WithMethod }>());
expectNotAssignable<JsonCompatible<WithMethod>>(value<WithMethod>());
expectNotAssignable<JsonCompatible<Date>>(value<Date>());

// Rejected: `undefined` array items serialize to `null`, which the declared type excludes.
expectNotAssignable<JsonCompatible<{ items: Array<string | undefined> }>>(
  value<{ items: Array<string | undefined> }>()
);

// Rejected: non-object top-level values, functions, and types too loose to check.
expectNotAssignable<JsonCompatible<string>>(value<string>());
expectNotAssignable<JsonCompatible<() => void>>(value<() => void>());
expectNotAssignable<JsonCompatible<bigint>>(value<bigint>());
expectNotAssignable<JsonCompatible<null>>(value<null>());
expectNotAssignable<JsonCompatible<undefined>>(value<undefined>());
expectNotAssignable<JsonCompatible<unknown>>(value<unknown>());
expectNotAssignable<JsonCompatible<Record<string, unknown>>>(value<Record<string, unknown>>());
