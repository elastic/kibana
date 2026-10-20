/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ChangeHistoryCompareSpec } from '@kbn/change-history-ui';

import { WORKFLOW_UNSAVED_CHANGE_ID } from './constants';
import { getWorkflowChangeHistoryCompareIndicator } from './get_workflow_change_history_compare_indicator';
import { UNSAVED_CHANGES_ACTION } from './translations';

const makeChange = (id: string, version: number, isCurrent?: boolean) => ({
  id,
  timestamp: '2026-06-16T12:00:00.000Z',
  actor: { name: 'Alice' },
  action: 'Updated',
  snapshot: { workflow: { yaml: `name: v${version}\n` } },
  metadata: { version },
  ...(isCurrent ? { isCurrent: true } : {}),
});

describe('getWorkflowChangeHistoryCompareIndicator', () => {
  it('maps baseline and target version numbers from compareSpec', () => {
    const compareSpec: ChangeHistoryCompareSpec = {
      comparisonType: 'vs_previous',
      baseline: makeChange('evt-5', 5),
      target: makeChange('evt-8', 8, true),
    };

    expect(getWorkflowChangeHistoryCompareIndicator(compareSpec)).toEqual({
      baselineVersion: 5,
      currentVersion: 8,
    });
  });

  it('uses the same mapping for vs_row', () => {
    const compareSpec: ChangeHistoryCompareSpec = {
      comparisonType: 'vs_row',
      baseline: makeChange('evt-5', 5),
      target: makeChange('evt-8', 8),
    };

    expect(getWorkflowChangeHistoryCompareIndicator(compareSpec)).toEqual({
      baselineVersion: 5,
      currentVersion: 8,
    });
  });

  it('uses the unsaved changes badge when the target has no version metadata', () => {
    const compareSpec: ChangeHistoryCompareSpec = {
      comparisonType: 'vs_previous',
      baseline: makeChange('evt-2', 2),
      target: {
        id: WORKFLOW_UNSAVED_CHANGE_ID,
        timestamp: '2026-07-03T12:00:00.000Z',
        actor: { name: 'You' },
        action: 'Unsaved changes',
        snapshot: { workflow: { yaml: 'name: draft\n' } },
        isCurrent: true,
      },
    };

    expect(getWorkflowChangeHistoryCompareIndicator(compareSpec)).toEqual({
      baselineVersion: 2,
      currentBadgeLabel: UNSAVED_CHANGES_ACTION,
      currentBadgeColor: 'warning',
    });
  });
});
