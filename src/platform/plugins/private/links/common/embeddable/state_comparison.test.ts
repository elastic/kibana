/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { areComparatorsEqual } from '@kbn/presentation-publishing';
import type { LinksEmbeddableState } from './types';
import { linksStateComparison } from './state_comparison';

const isEqual = (last: LinksEmbeddableState, current: LinksEmbeddableState) =>
  areComparatorsEqual(linksStateComparison.comparators, last, current);

const byValue = (destination: string, label?: string): LinksEmbeddableState => ({
  layout: 'horizontal',
  links: [
    {
      type: 'externalLink',
      destination,
      label,
      options: { open_in_new_tab: false, encode_url: true },
    },
  ],
});

describe('linksStateComparison', () => {
  it('compares links of by-value states, ignoring undefined keys', () => {
    expect(isEqual(byValue('https://a.co'), byValue('https://a.co', undefined))).toBe(true);
    expect(isEqual(byValue('https://a.co'), byValue('https://b.co'))).toBe(false);
    expect(
      isEqual(byValue('https://a.co'), { ...byValue('https://a.co'), layout: 'vertical' })
    ).toBe(false);
  });

  it('compares the library item of by-reference states', () => {
    expect(isEqual({ ref_id: '1' }, { ref_id: '1' })).toBe(true);
    expect(isEqual({ ref_id: '1' }, { ref_id: '2' })).toBe(false);
  });

  it.each([
    { name: 'linking', last: byValue('https://a.co'), current: { ref_id: '1' } },
    { name: 'unlinking', last: { ref_id: '1' }, current: byValue('https://a.co') },
  ])('detects $name', ({ last, current }) => {
    expect(isEqual(last, current)).toBe(false);
  });
});
