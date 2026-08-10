/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WORKFLOW_UNSAVED_CHANGE_ID } from './constants';
import { getWorkflowChangeHistoryRowDisplay } from './get_workflow_change_history_row_display';
import { CURRENT_VERSION_ONLY_BADGE, UNSAVED_CHANGES_ACTION } from './translations';

describe('getWorkflowChangeHistoryRowDisplay', () => {
  it('maps the unsaved pending row to a warning badge', () => {
    expect(
      getWorkflowChangeHistoryRowDisplay({
        id: WORKFLOW_UNSAVED_CHANGE_ID,
        isCurrent: true,
      })
    ).toEqual({
      kind: 'unsaved',
      badgeLabel: UNSAVED_CHANGES_ACTION,
      badgeColor: 'warning',
    });
  });

  it('maps current committed rows to the current badge and version number', () => {
    expect(
      getWorkflowChangeHistoryRowDisplay({
        id: 'evt-current',
        isCurrent: true,
        metadata: { version: 3 },
      })
    ).toEqual({
      kind: 'current',
      version: 3,
      badgeLabel: CURRENT_VERSION_ONLY_BADGE,
      badgeColor: 'hollow',
    });
  });

  it('maps current rows without version metadata to the current badge', () => {
    expect(
      getWorkflowChangeHistoryRowDisplay({
        id: 'evt-current',
        isCurrent: true,
      })
    ).toEqual({
      kind: 'current',
      version: undefined,
      badgeLabel: CURRENT_VERSION_ONLY_BADGE,
      badgeColor: 'hollow',
    });
  });
});
