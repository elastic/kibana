/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StoredAcl, StoredAclEntry } from './types';

/**
 * Name of the root document field that holds an object's ACL.
 */
export const ACL_FIELD = 'acl';

const ENTRIES_PATH = `${ACL_FIELD}.entries`;
const ENTRY_FIELDS = ['type', 'id', 'access', 'added_at'] as const;

/** Every value found for each field, by the field's full dotted path. */
type FieldValues = Map<string, unknown[]>;

/**
 * Reads the ACL from a whole document source, with the values Elasticsearch indexes for it.
 *
 * Reading `source.acl` alone isn't enough, because Elasticsearch also indexes dotted keys such as
 * `"acl.owner.id"` at the document root. The values of each field are merged from nested
 * objects, dotted keys, and arrays, and `null` values are dropped. Each object under
 * `acl.entries` is one entry, because that field is `nested` and Elasticsearch indexes each such
 * object as a separate document. Numbers and booleans become text, the way a `keyword` field
 * indexes them, except `version`, which keeps its stored values.
 *
 * @param source The document source, with every root key, not only `acl`.
 * @returns The stored ACL, or `undefined` when no ACL field holds a value.
 */
export const normalizeAclSource = (
  source: Readonly<Record<string, unknown>> | undefined
): StoredAcl | undefined => {
  if (!source) {
    return undefined;
  }

  const root: FieldValues = new Map();
  const entries: FieldValues[] = [];
  for (const [key, value] of Object.entries(source)) {
    if (key === ACL_FIELD || key.startsWith(`${ACL_FIELD}.`)) {
      collect(expandDottedKey(key, value), '', root, entries);
    }
  }

  const acl: StoredAcl = {
    version: root.get(`${ACL_FIELD}.version`) ?? [],
    owner: {
      type: toKeywords(root.get(`${ACL_FIELD}.owner.type`)),
      id: toKeywords(root.get(`${ACL_FIELD}.owner.id`)),
    },
    general_access: toKeywords(root.get(`${ACL_FIELD}.general_access`)),
    entries: entries.map(toStoredEntry).filter(hasEntryValue),
  };

  const hasValue =
    acl.version.length > 0 ||
    acl.owner.type.length > 0 ||
    acl.owner.id.length > 0 ||
    acl.general_access.length > 0 ||
    acl.entries.length > 0;
  return hasValue ? acl : undefined;
};

/**
 * Turns a stored ACL back into a value for the `acl` field, so that a rewrite of the whole document
 * keeps the ACL. The result indexes to the same values: a field with one value holds that value,
 * a field with several holds them all, and fields without values are left out. It has no dotted
 * keys, so the caller only has to remove the dotted `acl.*` keys from the document root.
 *
 * @param acl The stored ACL, as {@link normalizeAclSource} returns it.
 * @returns The value to store in the {@link ACL_FIELD} field.
 */
export const toAclSource = (acl: StoredAcl): Record<string, unknown> => {
  const source: Record<string, unknown> = {};
  setField(source, 'version', acl.version);
  setField(source, 'general_access', acl.general_access);

  const owner: Record<string, unknown> = {};
  setField(owner, 'type', acl.owner.type);
  setField(owner, 'id', acl.owner.id);
  if (Object.keys(owner).length > 0) {
    source.owner = owner;
  }

  if (acl.entries.length > 0) {
    source.entries = acl.entries.map((entry) => {
      const entrySource: Record<string, unknown> = {};
      for (const field of ENTRY_FIELDS) {
        setField(entrySource, field, entry[field]);
      }
      return entrySource;
    });
  }

  return source;
};

/**
 * Walks a source value and records every value under its field's full dotted path. Each object
 * found at `acl.entries` starts a new entry.
 */
const collect = (
  node: unknown,
  path: string,
  root: FieldValues,
  entries: FieldValues[],
  entry?: FieldValues
) => {
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
    // Elasticsearch rejects a plain value at a nested path, so only an object can form an entry.
    if (isPlainObject(node)) {
      const newEntry: FieldValues = new Map();
      entries.push(newEntry);
      collectObject(node, path, root, entries, newEntry);
    }
    return;
  }

  if (isPlainObject(node)) {
    collectObject(node, path, root, entries, entry);
    return;
  }

  const values = entry ?? root;
  values.set(path, [...(values.get(path) ?? []), node]);
};

const collectObject = (
  node: Record<string, unknown>,
  path: string,
  root: FieldValues,
  entries: FieldValues[],
  entry?: FieldValues
) => {
  for (const [key, value] of Object.entries(node)) {
    // A dotted key is expanded first, so a key such as `entries.id` inside `acl` forms an entry of
    // its own, the way Elasticsearch indexes it.
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
 * Turns `('a.b.c', value)` into `{ a: { b: { c: value } } }`.
 */
const expandDottedKey = (key: string, value: unknown): unknown =>
  key.split('.').reduceRight<unknown>((child, segment) => ({ [segment]: child }), value);

const toStoredEntry = (values: FieldValues): StoredAclEntry => ({
  type: toKeywords(values.get(`${ENTRIES_PATH}.type`)),
  id: toKeywords(values.get(`${ENTRIES_PATH}.id`)),
  access: toKeywords(values.get(`${ENTRIES_PATH}.access`)),
  added_at: toKeywords(values.get(`${ENTRIES_PATH}.added_at`)),
});

const hasEntryValue = (entry: StoredAclEntry) =>
  ENTRY_FIELDS.some((field) => entry[field].length > 0);

/**
 * Converts values to the text a `keyword` field indexes for them: `1` becomes `"1"`, and `true`
 * becomes `"true"`.
 */
const toKeywords = (values: unknown[] = []) =>
  values.flatMap((value) =>
    typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
      ? [String(value)]
      : []
  );

const setField = (target: Record<string, unknown>, field: string, values: unknown[]) => {
  if (values.length > 0) {
    target[field] = values.length === 1 ? values[0] : values;
  }
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
