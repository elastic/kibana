/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import isEqual from 'lodash/isEqual';
import { type Document, isMap, isNode, isSeq, parseDocument, type YAMLSeq } from 'yaml';
import { isRecord } from '@kbn/workflows-yaml';
import type { StepFormField } from './step_form_schema';
import { isEmptyFieldValue } from './step_form_schema';

const plainValue = (doc: Document, item: unknown): unknown =>
  isNode(item) ? item.toJS(doc) : item;

/** The index whose removal turns `previous` into `next`, when that is the only difference. */
const removedIndex = (
  previous: readonly unknown[],
  next: readonly unknown[]
): number | undefined => {
  if (next.length !== previous.length - 1) return undefined;
  const index = previous.findIndex((item, i) => i === next.length || !isEqual(item, next[i]));
  const rest = previous.filter((_, i) => i !== index);
  return isEqual(rest, next) ? index : undefined;
};

/**
 * Brings an existing sequence to `next` by changing only what differs, so the items that stay —
 * with their comments, anchors and flow style — keep their nodes. A whole-array `setIn` would
 * rebuild every item from plain values and drop all of that.
 */
const syncSequence = (doc: Document, seq: YAMLSeq, next: readonly unknown[]): void => {
  const previous = seq.items.map((item) => plainValue(doc, item));
  const removed = removedIndex(previous, next);
  if (removed !== undefined) {
    seq.delete(removed);
    return;
  }
  next.forEach((value, index) => {
    if (index >= previous.length) {
      seq.add(doc.createNode(value));
      return;
    }
    if (isEqual(previous[index], value)) return;
    const item = seq.items[index];
    const before = previous[index];
    if (isMap(item) && isRecord(before) && isRecord(value)) {
      Object.keys(before).forEach((key) => {
        if (!(key in value)) item.delete(key);
      });
      Object.entries(value).forEach(([key, entry]) => {
        if (!isEqual(before[key], entry)) item.set(key, doc.createNode(entry));
      });
      return;
    }
    seq.set(index, doc.createNode(value));
  });
  seq.items.splice(next.length);
};

/**
 * Writes one form-owned key back into the fragment. Only that key changes —
 * comments, unknown keys and Liquid expressions elsewhere are untouched.
 */
export const writeFragmentValue = (
  fragment: string,
  field: StepFormField,
  value: unknown,
  indent: number
): string => {
  const doc = parseDocument(fragment);
  // A document with errors cannot be stringified, so there is nothing to write back into.
  if (doc.errors.length > 0 || !isMap(doc.contents)) return fragment;
  const path = [...field.path];
  // An empty string is the expression-mode sentinel for boolean/number fields —
  // don't delete it; keep the key so the UI stays in expression mode, unless the field opts out (`deleteWhenEmpty`).
  if (isEmptyFieldValue(value) && (value !== '' || field.deleteWhenEmpty) && !field.required) {
    // Nothing to delete when the key — or an ancestor mapping like `with` —
    // is absent: unlike `setIn`, `deleteIn` throws on a missing intermediate
    // node instead of treating it as a no-op.
    if (doc.hasIn(path)) {
      doc.deleteIn(path);
    }
  } else {
    const current = doc.getIn(path, true);
    // An empty list has no items whose nodes are worth keeping, only its `[]` flow style, which
    // would drag every item written into it (and every step inserted under it later) into flow
    // style. So the first items are written fresh, in block style.
    const growsFromEmpty =
      isSeq(current) && current.items.length === 0 && Array.isArray(value) && value.length > 0;
    if (isSeq(current) && Array.isArray(value) && !growsFromEmpty)
      syncSequence(doc, current, value);
    else doc.setIn(path, value);
  }
  return doc.toString({ indent, lineWidth: 0 });
};
