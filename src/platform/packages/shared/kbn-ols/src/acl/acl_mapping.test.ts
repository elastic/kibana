/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ACL_MAPPING } from './acl_mapping';
import { ACL_FIELD, normalizeAclSource, toAclSource } from './acl_source';

interface MappingNode {
  readonly type?: string;
  readonly properties?: Readonly<Record<string, MappingNode>>;
}

/** The mapped leaf fields, by full path, with the field type of each. */
const mappedLeaves = (node: MappingNode, path: string): Array<[string, string]> =>
  node.properties
    ? Object.entries(node.properties).flatMap(([name, child]) =>
        mappedLeaves(child, `${path}.${name}`)
      )
    : [[path, node.type!]];

/** The leaf paths of a value, reading the first object of an array of objects. */
const leafPaths = (value: unknown, path: string): string[] => {
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
    return leafPaths(value[0], path);
  }
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return Object.entries(value).flatMap(([key, child]) => leafPaths(child, `${path}.${key}`));
  }
  return [path];
};

const VALUE_BY_TYPE: Record<string, unknown> = {
  integer: 1,
  keyword: 'value',
  date: '2026-01-01T00:00:00.000Z',
};

/** A document source with a value at every mapped leaf. */
const sourceWithEveryField = (leaves: Array<[string, string]>) => {
  const source: Record<string, unknown> = {};
  for (const [path, type] of leaves) {
    const segments = path.split('.');
    let node = source;
    for (const segment of segments.slice(0, -1)) {
      node = (node[segment] ??= {}) as Record<string, unknown>;
    }
    node[segments[segments.length - 1]] = VALUE_BY_TYPE[type];
  }
  return source;
};

describe('ACL_MAPPING', () => {
  const leaves = mappedLeaves(ACL_MAPPING, ACL_FIELD);
  const mappedPaths = leaves.map(([path]) => path).sort();

  it('has a test value for every mapped field type', () => {
    expect(leaves.filter(([, type]) => !(type in VALUE_BY_TYPE))).toEqual([]);
  });

  it('matches the fields that normalizeAclSource reads and toAclSource writes', () => {
    const acl = normalizeAclSource(sourceWithEveryField(leaves));

    expect(leafPaths(acl, ACL_FIELD).sort()).toEqual(mappedPaths);
    expect(leafPaths(toAclSource(acl!), ACL_FIELD).sort()).toEqual(mappedPaths);
  });

  it('keeps a value for every mapped field', () => {
    const acl = toAclSource(normalizeAclSource(sourceWithEveryField(leaves))!);
    const source = sourceWithEveryField(leaves);

    expect({ [ACL_FIELD]: acl }).toEqual({
      [ACL_FIELD]: {
        ...(source[ACL_FIELD] as Record<string, unknown>),
        entries: [(source[ACL_FIELD] as Record<string, unknown>).entries],
      },
    });
  });
});
