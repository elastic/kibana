/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ChangeHistoryListItem } from '@kbn/change-history-ui';

import { WORKFLOW_UNSAVED_CHANGE_ID } from './constants';
import { CURRENT_VERSION_ONLY_BADGE, UNSAVED_CHANGES_ACTION } from './translations';

export type WorkflowChangeHistoryBadgeColor = 'hollow' | 'warning';

export type WorkflowChangeHistoryRowDisplayKind = 'unsaved' | 'current' | 'version' | 'none';

export interface WorkflowChangeHistoryRowDisplay {
  kind: WorkflowChangeHistoryRowDisplayKind;
  version?: number;
  badgeLabel?: string;
  badgeColor?: WorkflowChangeHistoryBadgeColor;
}

export type WorkflowChangeHistoryRowLike = Pick<
  ChangeHistoryListItem,
  'id' | 'isCurrent' | 'metadata'
>;

export const getWorkflowChangeHistoryVersionNumber = (
  item: WorkflowChangeHistoryRowLike
): number | undefined => {
  const version = item.metadata?.version;
  return typeof version === 'number' ? version : undefined;
};

/** Single source of truth for timeline badges and compare split-pane labels. */
export const getWorkflowChangeHistoryRowDisplay = (
  item: WorkflowChangeHistoryRowLike
): WorkflowChangeHistoryRowDisplay => {
  if (item.id === WORKFLOW_UNSAVED_CHANGE_ID) {
    return {
      kind: 'unsaved',
      badgeLabel: UNSAVED_CHANGES_ACTION,
      badgeColor: 'warning',
    };
  }

  const version = getWorkflowChangeHistoryVersionNumber(item);

  if (item.isCurrent) {
    return {
      kind: 'current',
      version,
      ...(version == null
        ? { badgeLabel: CURRENT_VERSION_ONLY_BADGE, badgeColor: 'hollow' as const }
        : {}),
    };
  }

  if (version != null) {
    return {
      kind: 'version',
      version,
    };
  }

  return { kind: 'none' };
};
