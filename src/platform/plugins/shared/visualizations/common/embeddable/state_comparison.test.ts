/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { areComparatorsEqual } from '@kbn/presentation-publishing';
import type { VisualizeByValueState, VisualizeEmbeddableState } from './types';
import { visualizeStateComparison } from './state_comparison';

const { comparators } = visualizeStateComparison;

const byValue = (params: Record<string, unknown>) =>
  ({
    savedVis: {
      title: 'vis',
      type: 'markdown',
      params,
      data: { aggs: [] },
    },
  } as unknown as VisualizeByValueState);

const isEqual = (last: VisualizeEmbeddableState, current: VisualizeEmbeddableState) =>
  areComparatorsEqual(comparators, last, current);

describe('visualizeStateComparison', () => {
  it('treats savedVis values that only differ by empty values as equal', () => {
    expect(isEqual(byValue({ markdown: 'a', style: {} }), byValue({ markdown: 'a' }))).toBe(true);
  });

  it('detects a changed savedVis', () => {
    expect(isEqual(byValue({ markdown: 'a' }), byValue({ markdown: 'b' }))).toBe(false);
  });

  it('compares uiState of by-reference states', () => {
    expect(isEqual({ savedObjectId: '1', uiState: { a: 1 } }, { savedObjectId: '1' })).toBe(false);
    expect(isEqual({ savedObjectId: '1' }, { savedObjectId: '1' })).toBe(true);
  });

  it('detects unlinking from the library', () => {
    expect(isEqual({ savedObjectId: '1' }, byValue({ markdown: 'a' }))).toBe(false);
  });
});
