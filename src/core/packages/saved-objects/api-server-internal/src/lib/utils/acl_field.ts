/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { escapeRegExp } from 'lodash';
import { ACL_FIELD, ACL_MAPPING } from '@kbn/ols';

interface MappingNode {
  properties?: Record<string, MappingNode>;
}

const collectPaths = (path: string, node: MappingNode): string[] => [
  path,
  ...Object.entries(node.properties ?? {}).flatMap(([name, child]) =>
    collectPaths(`${path}.${name}`, child)
  ),
];

/** The `acl` field and every field under it, as its mapping defines them. */
export const ACL_FIELD_PATHS: readonly string[] = collectPaths(
  ACL_FIELD,
  ACL_MAPPING as unknown as MappingNode
);

/**
 * Checks whether a root field name or pattern reaches the stored ACL: `acl` or any field under it.
 *
 * Callers can never search, sort, aggregate, or read the stored ACL through query options, because
 * it would tell them who owns an object and who has access to it. Elasticsearch field patterns use
 * `*` as a wildcard, so patterns such as `*`, `a*`, and `*.access` also reach it.
 *
 * @param pattern A root field name or pattern, without a type prefix.
 * @returns `true` when the pattern names the ACL or any field under it.
 */
export const matchesAclField = (pattern: string): boolean => {
  if (!pattern.includes('*')) {
    return pattern === ACL_FIELD || pattern.startsWith(`${ACL_FIELD}.`);
  }
  const matcher = new RegExp(`^${pattern.split('*').map(escapeRegExp).join('.*')}$`);
  return ACL_FIELD_PATHS.some((path) => matcher.test(path));
};
