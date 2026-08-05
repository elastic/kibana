/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsHitRecord } from '@kbn/discover-utils/types';
import type { TreeExpansionState } from './json_tree_viewer';

// The JSON tree cell keeps its expand/reveal state in local component state, but in-table search
// remounts every cell on each keystroke (a search-term-keyed React `key` on the grid's highlight
// wrapper), which would otherwise collapse everything. This store holds that state *outside* the
// cell so a freshly mounted tree can restore it.
//
// Keyed by the raw ES hit — the same stable object the document-tree cache uses — so an entry is
// released automatically once the row is dropped, never leaks, and never bleeds across documents.
// In-memory only: expansion is per loaded document and resets when the data reloads and the row
// objects change (new query, sort, refresh).
const store = new WeakMap<EsHitRecord, TreeExpansionState>();

export const getTreeExpansion = (hit: EsHitRecord): TreeExpansionState | undefined =>
  store.get(hit);

export const setTreeExpansion = (hit: EsHitRecord, state: TreeExpansionState): void => {
  store.set(hit, state);
};
