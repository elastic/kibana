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
type Resolver = (versions: string[], access: 'public' | 'internal') => undefined | string;

const sort = (versions: string[], access: 'public' | 'internal') => {
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

const oldest: Resolver = (versions, access) => sort(versions, access)[0];

const newest: Resolver = (versions, access) => sort(versions, access).reverse()[0];

const none: Resolver = () => undefined;

export const resolvers = {
  oldest,
  newest,
  none,
};
