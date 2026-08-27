/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isMissingMergeBaseBaselineReport } from './on_complete';

describe('isMissingMergeBaseBaselineReport', () => {
  it('matches CI Stats reports with no merge base baseline build', () => {
    expect(
      isMissingMergeBaseBaselineReport(
        'ERROR: no builds found for mergeBase sha [cc86b528878d5fbb973175671b237804d7ffc76c]'
      )
    ).toBe(true);
  });

  it('does not match other CI Stats errors', () => {
    expect(isMissingMergeBaseBaselineReport('ERROR: page load bundle size increased')).toBe(false);
  });
});
