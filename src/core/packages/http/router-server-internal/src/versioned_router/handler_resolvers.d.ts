/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Sort Kibana HTTP API versions from oldest to newest
 *
 * @example Given 'internal' versions ["1", "10", "2"] it will return ["1", "2", "10]
 * @example Given 'public' versions ["2023-01-01", "2002-10-10", "2005-01-01"] it will return ["2002-10-10", "2005-01-01", "2023-01-01"]
 */
export declare const sort: (versions: string[], access: 'public' | 'internal') => string[];
/**
 * Assumes that there is at least one version in the array.
 * @internal
 */
type Resolver = (versions: string[], access: 'public' | 'internal') => undefined | string;
export declare const resolvers: {
  sort: typeof sort;
  oldest: Resolver;
  newest: Resolver;
  none: Resolver;
};
export {};
