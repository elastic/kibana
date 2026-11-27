/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ACL_FIELD, ACL_MAPPING } from '@kbn/ols';

/** A mapping node: a field with a type, an object with properties, or both (such as `nested`). */
interface MappingNode {
  readonly type?: string;
  readonly properties?: Readonly<Record<string, MappingNode>>;
}

const collectPaths = (path: string, node: MappingNode): string[] => [
  path,
  ...Object.entries(node.properties ?? {}).flatMap(([name, child]) =>
    collectPaths(`${path}.${name}`, child)
  ),
];

/** The `acl` field and every field under it, as its mapping defines them. */
export const ACL_FIELD_PATHS: readonly string[] = collectPaths(ACL_FIELD, ACL_MAPPING);

/**
 * Checks whether `value` matches `pattern`, where `*` matches any run of characters, dots included,
 * and every other character matches itself. It walks both strings once, backing up only to the last
 * `*`, so its time grows with their lengths for any pattern, unlike a regular expression built from
 * the pattern.
 */
const matchesPattern = (pattern: string, value: string): boolean => {
  let p = 0;
  let v = 0;
  let star = -1;
  let resume = 0;
  while (v < value.length) {
    if (p < pattern.length && pattern[p] !== '*' && pattern[p] === value[v]) {
      p++;
      v++;
    } else if (p < pattern.length && pattern[p] === '*') {
      star = p++;
      resume = v;
    } else if (star !== -1) {
      p = star + 1;
      v = ++resume;
    } else {
      return false;
    }
  }
  while (pattern[p] === '*') {
    p++;
  }
  return p === pattern.length;
};

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
  return ACL_FIELD_PATHS.some((path) => matchesPattern(pattern, path));
};
