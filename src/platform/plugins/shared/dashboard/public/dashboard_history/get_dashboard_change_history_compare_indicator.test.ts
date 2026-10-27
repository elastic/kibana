/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ChangeHistoryCompareSpec, ChangeHistoryDetail } from '@kbn/change-history-ui';

import { DASHBOARD_UNSAVED_CHANGES_ACTION } from '../../common/constants';
import { getDashboardChangeHistoryCompareIndicator } from './get_dashboard_change_history_compare_indicator';

const makeDetail = (overrides: Partial<ChangeHistoryDetail> = {}): ChangeHistoryDetail => ({
  id: 'change-1',
  timestamp: '2026-06-16T12:00:00.000Z',
  actor: { name: 'Alice' },
  action: 'update',
  snapshot: {},
  ...overrides,
});

const makeSpec = (
  baseline: Partial<ChangeHistoryDetail>,
  target: Partial<ChangeHistoryDetail>
): ChangeHistoryCompareSpec => ({
  comparisonType: 'vs_previous',
  baseline: makeDetail(baseline),
  target: makeDetail(target),
});

describe('getDashboardChangeHistoryCompareIndicator', () => {
  it('returns both version numbers when present', () => {
    expect(
      getDashboardChangeHistoryCompareIndicator(
        makeSpec({ metadata: { version: 2 } }, { metadata: { version: 5 } })
      )
    ).toEqual({ baselineVersion: 2, currentVersion: 5 });
  });

  it('labels an unsaved target with a warning badge', () => {
    const indicator = getDashboardChangeHistoryCompareIndicator(
      makeSpec({ metadata: { version: 2 } }, { action: DASHBOARD_UNSAVED_CHANGES_ACTION })
    );

    expect(indicator.baselineVersion).toBe(2);
    expect(indicator.currentVersion).toBeUndefined();
    expect(indicator.currentBadgeColor).toBe('warning');
    expect(indicator.currentBadgeLabel).toBeTruthy();
  });

  it('labels a current target without a version as the current version', () => {
    expect(
      getDashboardChangeHistoryCompareIndicator(
        makeSpec({ metadata: { version: 2 } }, { isCurrent: true })
      )
    ).toEqual({
      baselineVersion: 2,
      currentBadgeLabel: 'Current version',
      currentBadgeColor: 'hollow',
    });
  });

  it('omits the current label when the target has no version or special state', () => {
    expect(getDashboardChangeHistoryCompareIndicator(makeSpec({}, {}))).toEqual({
      baselineVersion: undefined,
    });
  });
});
