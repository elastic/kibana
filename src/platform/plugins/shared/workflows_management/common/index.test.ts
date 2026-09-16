/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  areStepExecutionsUnavailable,
  getOmittedStepExecutionsCount,
  WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE,
} from '.';

describe('getOmittedStepExecutionsCount', () => {
  it('is zero when total fits in the UI page', () => {
    expect(getOmittedStepExecutionsCount(WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE)).toBe(0);
    expect(getOmittedStepExecutionsCount(13)).toBe(0);
  });

  it('counts steps past the UI page budget, not loaded-vs-total gaps', () => {
    expect(getOmittedStepExecutionsCount(WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE + 842)).toBe(842);
  });
});

describe('areStepExecutionsUnavailable', () => {
  it('is false while an in-progress run has a single-page mget gap', () => {
    expect(
      areStepExecutionsUnavailable({
        stepExecutionsTotal: 50,
        loadedCount: 0,
        isInProgress: true,
      })
    ).toBe(false);
  });

  it('is true when a finished run reported steps but none loaded', () => {
    expect(
      areStepExecutionsUnavailable({
        stepExecutionsTotal: 50,
        loadedCount: 0,
        isInProgress: false,
      })
    ).toBe(true);
  });

  it('is true when an in-progress run exceeds the UI page and none loaded', () => {
    expect(
      areStepExecutionsUnavailable({
        stepExecutionsTotal: WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE + 1,
        loadedCount: 0,
        isInProgress: true,
      })
    ).toBe(true);
  });

  it('is false when some rows loaded', () => {
    expect(
      areStepExecutionsUnavailable({
        stepExecutionsTotal: 1842,
        loadedCount: 1000,
        isInProgress: false,
      })
    ).toBe(false);
  });
});
