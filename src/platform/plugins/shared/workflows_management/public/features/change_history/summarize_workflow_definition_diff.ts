/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as i18n from './translations';
import type { WorkflowChangeSummaryGroup } from './workflow_change_history_item_changes_summary';

type WorkflowDefinitionChangeKind =
  | 'step_added'
  | 'step_removed'
  | 'step_modified'
  | 'trigger_added'
  | 'trigger_removed'
  | 'trigger_modified'
  | 'setting_changed';

export interface WorkflowDefinitionChangeForSummary {
  kind: WorkflowDefinitionChangeKind;
  label: string;
}

interface WorkflowChangeCounts {
  added: number;
  removed: number;
  updated: number;
}

const buildCountLines = ({ added, removed, updated }: WorkflowChangeCounts): string[] => {
  const lines: string[] = [];

  if (added > 0) {
    lines.push(i18n.CHANGES_ADDED(added));
  }

  if (removed > 0) {
    lines.push(i18n.CHANGES_REMOVED(removed));
  }

  if (updated > 0) {
    lines.push(i18n.CHANGES_UPDATED(updated));
  }

  return lines;
};

const buildSummaryGroup = (
  title: string,
  counts: WorkflowChangeCounts
): WorkflowChangeSummaryGroup | undefined => {
  const lines = buildCountLines(counts);

  if (lines.length === 0) {
    return undefined;
  }

  return { title, lines };
};

export const summarizeWorkflowDefinitionDiff = (
  changes: WorkflowDefinitionChangeForSummary[]
): WorkflowChangeSummaryGroup[] => {
  const stepAdded = changes.filter((change) => change.kind === 'step_added').length;
  const stepRemoved = changes.filter((change) => change.kind === 'step_removed').length;
  const stepModified = changes.filter((change) => change.kind === 'step_modified').length;
  const triggerAdded = changes.filter((change) => change.kind === 'trigger_added').length;
  const triggerRemoved = changes.filter((change) => change.kind === 'trigger_removed').length;
  const triggerModified = changes.filter((change) => change.kind === 'trigger_modified').length;
  const settingsUpdated = changes.filter((change) => change.kind === 'setting_changed').length;

  return [
    buildSummaryGroup(i18n.CHANGES_SUMMARY_STEPS, {
      added: stepAdded,
      removed: stepRemoved,
      updated: stepModified,
    }),
    buildSummaryGroup(i18n.CHANGES_SUMMARY_TRIGGERS, {
      added: triggerAdded,
      removed: triggerRemoved,
      updated: triggerModified,
    }),
    buildSummaryGroup(i18n.CHANGES_SUMMARY_SETTINGS, {
      added: 0,
      removed: 0,
      updated: settingsUpdated,
    }),
  ].filter((group): group is WorkflowChangeSummaryGroup => group != null);
};
