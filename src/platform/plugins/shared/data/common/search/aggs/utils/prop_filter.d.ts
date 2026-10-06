/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

type FilterFunc<P extends keyof T, T> = (item: T[P]) => boolean;
/**
 * Filters out a list by a given filter. This is currently used to implement:
 *   - fieldType filters a list of fields by their type property
 *   - aggFilter filters a list of aggs by their name property
 *
 * @returns the filter function which can be registered with angular
 */
export declare function propFilter<P extends string>(
  prop: P
): <T extends { [key in P]: T[P] }>(
  list: T[],
  filters?: string[] | string | FilterFunc<P, T>
) => T[];
export {};
