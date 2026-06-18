/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { sampleWorkflowHistoryItems } from './fixtures/sample_workflow_history_items';
import {
  mapWorkflowHistoryItemToDetail,
  mapWorkflowHistoryItemToListItem,
} from './map_workflow_history_item';
import { WorkflowChangeHistoryAction } from '../../../common/lib/workflow_change_history/constants';

describe('mapWorkflowHistoryItem', () => {
  it('maps list rows with actor, action label, version metadata, and current flag', () => {
    const [current, previous] = sampleWorkflowHistoryItems;

    expect(mapWorkflowHistoryItemToListItem(current, { isCurrent: true })).toEqual({
      id: 'evt-current',
      timestamp: '2026-06-16T12:00:00.000Z',
      actor: { name: 'Alice', profileId: 'user-1' },
      action: 'Updated',
      isCurrent: true,
      metadata: { version: 3 },
    });

    expect(mapWorkflowHistoryItemToListItem(previous)).toEqual({
      id: 'evt-previous',
      timestamp: '2026-06-15T12:00:00.000Z',
      actor: { name: 'System' },
      action: 'Created',
      metadata: { version: 1 },
    });
  });

  it('maps detail with workflow yaml snapshot', () => {
    const detail = mapWorkflowHistoryItemToDetail(sampleWorkflowHistoryItems[0], {
      isCurrent: true,
    });

    expect(detail.snapshot).toEqual({
      workflow: {
        yaml: 'name: current\n',
      },
    });
    expect(detail.action).toBe('Updated');
  });

  it('falls back to raw action when label is unknown', () => {
    expect(
      mapWorkflowHistoryItemToListItem({
        ...sampleWorkflowHistoryItems[0],
        action: WorkflowChangeHistoryAction.workflowInstall,
      }).action
    ).toBe('Installed');

    expect(
      mapWorkflowHistoryItemToListItem({
        ...sampleWorkflowHistoryItems[0],
        action: 'custom-action',
      }).action
    ).toBe('custom-action');
  });
});
