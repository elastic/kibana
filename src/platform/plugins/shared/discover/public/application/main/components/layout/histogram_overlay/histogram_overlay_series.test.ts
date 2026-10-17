/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSingleCategorizeGroupField } from './histogram_overlay_series';

describe('getSingleCategorizeGroupField', () => {
  it('returns the field when there is exactly one categorize grouping', () => {
    expect(
      getSingleCategorizeGroupField([
        { field: 'Pattern', type: 'categorize' },
        { field: 'host', type: 'column' },
      ])
    ).toBe('Pattern');
  });

  it('returns undefined when there is no categorize grouping', () => {
    expect(getSingleCategorizeGroupField([{ field: 'host', type: 'column' }])).toBeUndefined();
  });

  it('returns undefined when there is more than one categorize grouping', () => {
    expect(
      getSingleCategorizeGroupField([
        { field: 'Pattern', type: 'categorize' },
        { field: 'Other', type: 'categorize' },
      ])
    ).toBeUndefined();
  });
});
