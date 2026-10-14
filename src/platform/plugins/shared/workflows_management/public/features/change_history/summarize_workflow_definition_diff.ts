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

interface WorkflowDefinitionDiffCounts {
  step: WorkflowChangeCounts;
  trigger: WorkflowChangeCounts;
  setting: WorkflowChangeCounts;
}

const emptyWorkflowChangeCounts = (): WorkflowChangeCounts => ({
  added: 0,
  removed: 0,
  updated: 0,
});

const emptyWorkflowDefinitionDiffCounts = (): WorkflowDefinitionDiffCounts => ({
  step: emptyWorkflowChangeCounts(),
  trigger: emptyWorkflowChangeCounts(),
  setting: emptyWorkflowChangeCounts(),
});

const incrementDiffCount = (
  counts: WorkflowDefinitionDiffCounts,
  change: WorkflowDefinitionChangeForSummary
): WorkflowDefinitionDiffCounts => {
  switch (change.kind) {
    case 'step_added':
      counts.step.added += 1;
      break;
    case 'step_removed':
      counts.step.removed += 1;
      break;
    case 'step_modified':
      counts.step.updated += 1;
      break;
    case 'trigger_added':
      counts.trigger.added += 1;
      break;
    case 'trigger_removed':
      counts.trigger.removed += 1;
      break;
    case 'trigger_modified':
      counts.trigger.updated += 1;
      break;
    case 'setting_changed':
      counts.setting.updated += 1;
      break;
  }

  return counts;
};

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
  const counts = changes.reduce(incrementDiffCount, emptyWorkflowDefinitionDiffCounts());

  return [
    buildSummaryGroup(i18n.CHANGES_SUMMARY_STEPS, counts.step),
    buildSummaryGroup(i18n.CHANGES_SUMMARY_TRIGGERS, counts.trigger),
    buildSummaryGroup(i18n.CHANGES_SUMMARY_SETTINGS, counts.setting),
  ].filter((group): group is WorkflowChangeSummaryGroup => group != null);
};
