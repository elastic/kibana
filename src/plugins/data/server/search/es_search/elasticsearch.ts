/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export interface StringMap<T = unknown> {
  [key: string]: T;
}

export type IndexAsString<Map> = {
  [k: string]: Map[keyof Map];
} & Map;

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export interface BoolQuery {
  must_not: Array<Record<string, any>>;
  should: Array<Record<string, any>>;
  filter: Array<Record<string, any>>;
}
