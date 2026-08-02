/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { DataTableRecord } from '@kbn/discover-utils/types';

/**
 * Identifies the document expanded in the doc viewer flyout, so it can be captured
 * in a shareable link and restored on load.
 *
 * `_id` and `_index` are kept separate rather than using the composed doc ID
 * (see `getDocId`) so the reference stays parseable when `_index` is a cross cluster
 * reference (e.g. `cluster:index`), and so it maps directly onto the
 * `METADATA _id, _index` columns if ES|QL support is added later.
 */
export interface ExpandedDocRef extends SerializableRecord {
  id: string;
  index: string;
}

/**
 * Builds the shareable reference for a record, or `undefined` when the record has no
 * stable identity. ES|QL rows only carry `_id` and `_index` when the query requests
 * `METADATA _id, _index`, so this doubles as the check for whether a record is linkable.
 */
export const getExpandedDocRef = (
  doc: DataTableRecord | undefined
): ExpandedDocRef | undefined => {
  const { _id: id, _index: index } = doc?.raw ?? {};

  return id && index ? { id, index } : undefined;
};

/**
 * Matches a record against a reference. Compares the raw fields rather than the composed
 * doc ID so the result is unaffected by `_routing`, which the reference does not carry.
 */
export const matchesExpandedDocRef = (doc: DataTableRecord, ref: ExpandedDocRef) =>
  doc.raw._id === ref.id && doc.raw._index === ref.index;
