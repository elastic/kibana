/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';
import { parseWorkflowYamlForAutocomplete } from '@kbn/workflows-yaml';
import { countWorkflowYamlLineChanges } from './count_workflow_yaml_line_changes';
import { summarizeWorkflowDefinitionDiff } from './summarize_workflow_definition_diff';
import type { WorkflowChangeSummaryGroup } from './workflow_change_history_item_changes_summary';

export interface WorkflowYamlChanges {
  count: number;
  summaryGroups?: WorkflowChangeSummaryGroup[];
}

interface WorkflowDefinitionChange {
  kind:
    | 'step_added'
    | 'step_removed'
    | 'step_modified'
    | 'trigger_added'
    | 'trigger_removed'
    | 'trigger_modified'
    | 'setting_changed';
  label: string;
}

type WorkflowStep = WorkflowYaml['steps'][number];

interface FlattenedStep {
  path: string;
  name: string;
  step: WorkflowStep;
}

const WORKFLOW_SETTING_FIELDS = [
  'name',
  'description',
  'enabled',
  'tags',
  'settings',
  'outputs',
  'consts',
] as const satisfies ReadonlyArray<keyof WorkflowYaml>;

const stableSerialize = (value: unknown): string => JSON.stringify(value);

const flattenSteps = (steps: WorkflowStep[] | undefined, parentPath = ''): FlattenedStep[] => {
  if (!steps) {
    return [];
  }

  const flattened: FlattenedStep[] = [];

  for (const step of steps) {
    const path = parentPath ? `${parentPath}.${step.name}` : step.name;
    flattened.push({ path, name: step.name, step });

    if ('steps' in step && Array.isArray(step.steps)) {
      flattened.push(...flattenSteps(step.steps as WorkflowStep[], path));
    }

    if ('branches' in step && Array.isArray(step.branches)) {
      step.branches.forEach((branch, branchIndex) => {
        flattened.push(
          ...flattenSteps(branch.steps as WorkflowStep[], `${path}.branch[${branchIndex}]`)
        );
      });
    }
  }

  return flattened;
};

const compareWorkflowSettings = (
  baseline: WorkflowYaml,
  target: WorkflowYaml
): WorkflowDefinitionChange[] => {
  const changes: WorkflowDefinitionChange[] = [];

  for (const field of WORKFLOW_SETTING_FIELDS) {
    const baselineValue = baseline[field];
    const targetValue = target[field];

    if (stableSerialize(baselineValue) !== stableSerialize(targetValue)) {
      changes.push({
        kind: 'setting_changed',
        label: field,
      });
    }
  }

  return changes;
};

const compareTriggers = (
  baseline: WorkflowYaml['triggers'],
  target: WorkflowYaml['triggers']
): WorkflowDefinitionChange[] => {
  const changes: WorkflowDefinitionChange[] = [];
  const maxLength = Math.max(baseline.length, target.length);

  for (let index = 0; index < maxLength; index += 1) {
    const baselineTrigger = baseline[index];
    const targetTrigger = target[index];

    if (!baselineTrigger && targetTrigger) {
      changes.push({
        kind: 'trigger_added',
        label: targetTrigger.type,
      });
    } else if (baselineTrigger && !targetTrigger) {
      changes.push({
        kind: 'trigger_removed',
        label: baselineTrigger.type,
      });
    } else if (
      baselineTrigger &&
      targetTrigger &&
      stableSerialize(baselineTrigger) !== stableSerialize(targetTrigger)
    ) {
      changes.push({
        kind: 'trigger_modified',
        label: targetTrigger.type,
      });
    }
  }

  return changes;
};

const compareSteps = (
  baseline: WorkflowYaml['steps'],
  target: WorkflowYaml['steps']
): WorkflowDefinitionChange[] => {
  const changes: WorkflowDefinitionChange[] = [];
  const baselineSteps = new Map(flattenSteps(baseline).map((entry) => [entry.path, entry]));
  const targetSteps = new Map(flattenSteps(target).map((entry) => [entry.path, entry]));

  for (const [path, baselineEntry] of baselineSteps) {
    const targetEntry = targetSteps.get(path);

    if (!targetEntry) {
      changes.push({
        kind: 'step_removed',
        label: baselineEntry.name,
      });
    } else if (stableSerialize(baselineEntry.step) !== stableSerialize(targetEntry.step)) {
      changes.push({
        kind: 'step_modified',
        label: targetEntry.name,
      });
    }
  }

  for (const [path, targetEntry] of targetSteps) {
    if (!baselineSteps.has(path)) {
      changes.push({
        kind: 'step_added',
        label: targetEntry.name,
      });
    }
  }

  return changes;
};

const computeSemanticWorkflowYamlChanges = (
  baselineYaml: string,
  targetYaml: string
): WorkflowYamlChanges | undefined => {
  const baselineParse = parseWorkflowYamlForAutocomplete(baselineYaml);
  const targetParse = parseWorkflowYamlForAutocomplete(targetYaml);

  if (!baselineParse.success || !targetParse.success) {
    return undefined;
  }

  const baseline = baselineParse.data as WorkflowYaml;
  const target = targetParse.data as WorkflowYaml;

  const hasSemanticShape =
    Array.isArray(baseline.steps) &&
    baseline.steps.length > 0 &&
    Array.isArray(target.steps) &&
    target.steps.length > 0 &&
    Array.isArray(baseline.triggers) &&
    baseline.triggers.length > 0 &&
    Array.isArray(target.triggers) &&
    target.triggers.length > 0;

  if (!hasSemanticShape) {
    return undefined;
  }

  const definitionChanges: WorkflowDefinitionChange[] = [
    ...compareWorkflowSettings(baseline, target),
    ...compareTriggers(baseline.triggers ?? [], target.triggers ?? []),
    ...compareSteps(baseline.steps ?? [], target.steps ?? []),
  ];

  if (definitionChanges.length === 0) {
    return { count: 0 };
  }

  const summaryGroups = summarizeWorkflowDefinitionDiff(definitionChanges);

  return {
    count: definitionChanges.length,
    ...(summaryGroups.length > 0 ? { summaryGroups } : {}),
  };
};

/** Semantic workflow diff: baseline = immediate previous version, target = this version. */
export const computeWorkflowYamlChanges = (
  baselineYaml: string,
  targetYaml: string
): WorkflowYamlChanges => {
  if (baselineYaml === targetYaml) {
    return { count: 0 };
  }

  const semanticChanges = computeSemanticWorkflowYamlChanges(baselineYaml, targetYaml);
  if (semanticChanges) {
    return semanticChanges;
  }

  const lineHunkCount = countWorkflowYamlLineChanges(baselineYaml, targetYaml);
  return lineHunkCount > 0 ? { count: lineHunkCount } : { count: 0 };
};
