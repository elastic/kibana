/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CanonicalAcl, CanonicalAclEntry } from './types';

/**
 * Root field that stores the ACL in a document source.
 */
export const ACL_FIELD = 'acl';

const ENTRIES_PATH = `${ACL_FIELD}.entries`;
const ROOT_LEAVES = ['version', 'owner.type', 'owner.id', 'general_access'] as const;
const ENTRY_LEAVES = ['type', 'id', 'access', 'added_at'] as const;

type Leaves = Map<string, unknown[]>;

/**
 * Reads the ACL from a whole raw document source the way Elasticsearch indexes it: values from
 * nested objects, dotted keys and arrays are merged per leaf, and `null` values are dropped. Reading
 * `source.acl` alone is not enough, because a dotted root key such as `acl.owner.id` is indexed too.
 *
 * Returns `undefined` when no ACL leaf has a value: the document has no platform ACL.
 */
export const normalizeAclSource = (
  source: Readonly<Record<string, unknown>> | undefined
): CanonicalAcl | undefined => {
  if (!source) {
    return;
  }

  const root: Leaves = new Map();
  const entries: Leaves[] = [];
  for (const [key, value] of Object.entries(source)) {
    if (key === ACL_FIELD || key.startsWith(`${ACL_FIELD}.`)) {
      collect(expandDottedKey(key, value), '', root, entries);
    }
  }

  const canonical: CanonicalAcl = {
    version: root.get('acl.version') ?? [],
    owner: { type: keywords(root.get('acl.owner.type')), id: keywords(root.get('acl.owner.id')) },
    general_access: keywords(root.get('acl.general_access')),
    entries: entries.flatMap((leaves) => {
      const entry = Object.fromEntries(
        ENTRY_LEAVES.map((leaf) => [leaf, keywords(leaves.get(`${ENTRIES_PATH}.${leaf}`))])
      ) as unknown as CanonicalAclEntry;
      return ENTRY_LEAVES.some((leaf) => entry[leaf].length > 0) ? [entry] : [];
    }),
  };

  const hasValue =
    canonical.entries.length > 0 ||
    ROOT_LEAVES.some((leaf) => (root.get(`${ACL_FIELD}.${leaf}`)?.length ?? 0) > 0);
  return hasValue ? canonical : undefined;
};

/**
 * Turns a canonical ACL back into a source value for full-document rewrites. It indexes to the same
 * values, while dotted keys and empty leaves disappear.
 */
export const toStoredAcl = (acl: CanonicalAcl): Record<string, unknown> => {
  const stored: Record<string, unknown> = {};
  setLeaf(stored, 'version', acl.version);
  setLeaf(stored, 'general_access', acl.general_access);

  const owner: Record<string, unknown> = {};
  setLeaf(owner, 'type', acl.owner.type);
  setLeaf(owner, 'id', acl.owner.id);
  if (Object.keys(owner).length > 0) {
    stored.owner = owner;
  }

  if (acl.entries.length > 0) {
    stored.entries = acl.entries.map((entry) => {
      const storedEntry: Record<string, unknown> = {};
      for (const leaf of ENTRY_LEAVES) {
        setLeaf(storedEntry, leaf, entry[leaf]);
      }
      return storedEntry;
    });
  }

  return stored;
};

/**
 * Walks a source value and records every leaf under its full dotted path. Each object found at
 * `acl.entries` starts a new entry, because the field is `nested` and Elasticsearch indexes every
 * such object as a separate document.
 */
const collect = (node: unknown, path: string, root: Leaves, entries: Leaves[], entry?: Leaves) => {
  if (node === null || node === undefined) {
    return;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      collect(item, path, root, entries, entry);
    }
    return;
  }

  if (!entry && path === ENTRIES_PATH) {
    // Elasticsearch rejects concrete values at a nested path, so only objects can form an entry.
    if (isPlainObject(node)) {
      const newEntry: Leaves = new Map();
      entries.push(newEntry);
      collectObject(node, path, root, entries, newEntry);
    }
    return;
  }

  if (isPlainObject(node)) {
    collectObject(node, path, root, entries, entry);
    return;
  }

  const leaves = entry ?? root;
  leaves.set(path, [...(leaves.get(path) ?? []), node]);
};

const collectObject = (
  node: Record<string, unknown>,
  path: string,
  root: Leaves,
  entries: Leaves[],
  entry?: Leaves
) => {
  for (const [key, value] of Object.entries(node)) {
    // A dotted key is expanded first, so a key such as `entries.id` under `acl` forms its own entry.
    const [head, ...rest] = key.split('.');
    const childPath = path ? `${path}.${head}` : head;
    collect(
      rest.length > 0 ? expandDottedKey(rest.join('.'), value) : value,
      childPath,
      root,
      entries,
      entry
    );
  }
};

/**
 * Turns `{ 'a.b.c': value }` into `{ a: { b: { c: value } } }`.
 */
const expandDottedKey = (key: string, value: unknown) =>
  key.split('.').reduceRight<unknown>((child, segment) => ({ [segment]: child }), value) as Record<
    string,
    unknown
  >;

/**
 * Converts values to the strings a `keyword` field indexes. Profile UIDs start with `u_` and service
 * account IDs contain `/`, so no converted number or boolean can match a principal, kind, or level.
 */
const keywords = (values: unknown[] = []) =>
  values.flatMap((value) =>
    typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
      ? [String(value)]
      : []
  );

const setLeaf = (target: Record<string, unknown>, leaf: string, values: unknown[]) => {
  if (values.length > 0) {
    target[leaf] = values.length === 1 ? values[0] : values;
  }
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
