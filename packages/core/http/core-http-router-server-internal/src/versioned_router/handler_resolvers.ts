/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Assumes that there is at least one version in the array.
 * @internal
 */
type Resolver = (versions: string[]) => undefined | string;

const oldest: Resolver = (versions) => [...versions].sort((a, b) => a.localeCompare(b))[0];

const newest: Resolver = (versions) => [...versions].sort((a, b) => b.localeCompare(a))[0];

const none: Resolver = () => undefined;

export const resolvers = {
  oldest,
  newest,
  none,
};
