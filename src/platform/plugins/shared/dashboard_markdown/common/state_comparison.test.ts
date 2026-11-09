/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { areComparatorsEqual } from '@kbn/presentation-publishing';
import type { MarkdownEmbeddableState } from '../server';
import { markdownStateComparison } from './state_comparison';

const isEqual = (last: MarkdownEmbeddableState, current: MarkdownEmbeddableState) =>
  areComparatorsEqual(markdownStateComparison.comparators, last, current);

const byValue = (content: string, openLinksInNewTab = false): MarkdownEmbeddableState => ({
  content,
  settings: { open_links_in_new_tab: openLinksInNewTab },
});

describe('markdownStateComparison', () => {
  it('compares content and settings of by-value states', () => {
    expect(isEqual(byValue('a'), byValue('a'))).toBe(true);
    expect(isEqual(byValue('a'), byValue('b'))).toBe(false);
    expect(isEqual(byValue('a'), byValue('a', true))).toBe(false);
  });

  it('compares the library item of by-reference states', () => {
    expect(isEqual({ ref_id: '1' }, { ref_id: '1' })).toBe(true);
    expect(isEqual({ ref_id: '1' }, { ref_id: '2' })).toBe(false);
  });

  it.each([
    { name: 'linking', last: byValue('a'), current: { ref_id: '1' } },
    { name: 'unlinking', last: { ref_id: '1' }, current: byValue('a') },
  ])('detects $name', ({ last, current }) => {
    expect(isEqual(last, current)).toBe(false);
  });
});
