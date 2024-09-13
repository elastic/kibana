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
export const sort = (versions: string[], access: 'public' | 'internal') => {
  if (access === 'internal') {
    const versionNrs = versions.map((v) => {
      const nr = parseInt(v, 10);
      if (isNaN(nr)) throw new Error(`Found non numeric input for internal version: ${v}`);
      return nr;
    });
    return versionNrs.sort((a, b) => a - b).map((n) => n.toString());
  }
  return [...versions].sort((a, b) => a.localeCompare(b));
};

/**
 * Assumes that there is at least one version in the array.
 * @internal
 */
type Resolver = (versions: string[], access: 'public' | 'internal') => undefined | string;

const oldest: Resolver = (versions, access) => sort(versions, access)[0];

const newest: Resolver = (versions, access) => sort(versions, access).reverse()[0];

const none: Resolver = () => undefined;

export const resolvers = {
  sort,
  oldest,
  newest,
  none,
};
