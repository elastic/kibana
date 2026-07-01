/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { stableStringify } from '@kbn/std';
import { WorkflowSchemaForAutocomplete } from '@kbn/workflows';
import { parseWorkflowYamlForAutocomplete } from '@kbn/workflows-yaml';
import type { z } from '@kbn/zod/v4';
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

type ParsedWorkflowYaml = z.output<typeof WorkflowSchemaForAutocomplete>;
type ParsedWorkflowStep = ParsedWorkflowYaml['steps'][number];

const WORKFLOW_SETTING_FIELDS = [
  'name',
  'description',
  'enabled',
  'tags',
  'settings',
  'outputs',
  'consts',
] as const satisfies ReadonlyArray<keyof ParsedWorkflowYaml>;

interface FlattenedStep {
  path: string;
  name: string;
  step: ParsedWorkflowStep;
}

const parseWorkflowYamlForSemanticDiff = (yamlString: string): ParsedWorkflowYaml | undefined => {
  const parseResult = parseWorkflowYamlForAutocomplete(yamlString);
  if (!parseResult.success) {
    return undefined;
  }

  const schemaResult = WorkflowSchemaForAutocomplete.safeParse(parseResult.data);
  return schemaResult.success ? schemaResult.data : undefined;
};

const isValidStepName = (name: unknown): name is string =>
  typeof name === 'string' && name.trim().length > 0;

const isWorkflowStepArray = (value: unknown): value is ParsedWorkflowStep[] => {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every((entry) => typeof entry === 'object' && entry !== null);
};

const getBranchSteps = (branch: unknown): ParsedWorkflowStep[] | undefined => {
  if (typeof branch !== 'object' || branch === null) {
    return undefined;
  }

  const { steps } = branch as { steps?: unknown };
  return isWorkflowStepArray(steps) ? steps : undefined;
};

const flattenSteps = (steps: ParsedWorkflowYaml['steps'], parentPath = ''): FlattenedStep[] => {
  if (!steps) {
    return [];
  }

  const flattened: FlattenedStep[] = [];

  for (const step of steps) {
    if (isValidStepName(step.name)) {
      const path = parentPath ? `${parentPath}.${step.name}` : step.name;
      flattened.push({ path, name: step.name, step });

      if ('steps' in step && isWorkflowStepArray(step.steps)) {
        flattened.push(...flattenSteps(step.steps, path));
      }

      if ('branches' in step && Array.isArray(step.branches)) {
        step.branches.forEach((branch, branchIndex) => {
          const branchSteps = getBranchSteps(branch);
          if (branchSteps) {
            flattened.push(...flattenSteps(branchSteps, `${path}.branch[${branchIndex}]`));
          }
        });
      }
    }
  }

  return flattened;
};

const compareWorkflowSettings = (
  baseline: ParsedWorkflowYaml,
  target: ParsedWorkflowYaml
): WorkflowDefinitionChange[] => {
  const changes: WorkflowDefinitionChange[] = [];

  for (const field of WORKFLOW_SETTING_FIELDS) {
    const baselineValue = baseline[field];
    const targetValue = target[field];

    if (stableStringify(baselineValue) !== stableStringify(targetValue)) {
      changes.push({
        kind: 'setting_changed',
        label: field,
      });
    }
  }

  return changes;
};

const compareTriggers = (
  baseline: ParsedWorkflowYaml['triggers'],
  target: ParsedWorkflowYaml['triggers']
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
      stableStringify(baselineTrigger) !== stableStringify(targetTrigger)
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
  baseline: ParsedWorkflowYaml['steps'],
  target: ParsedWorkflowYaml['steps']
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
    } else if (stableStringify(baselineEntry.step) !== stableStringify(targetEntry.step)) {
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
  const baseline = parseWorkflowYamlForSemanticDiff(baselineYaml);
  const target = parseWorkflowYamlForSemanticDiff(targetYaml);

  if (!baseline || !target) {
    return undefined;
  }

  const definitionChanges: WorkflowDefinitionChange[] = [
    ...compareWorkflowSettings(baseline, target),
    ...compareTriggers(baseline.triggers, target.triggers),
    ...compareSteps(baseline.steps, target.steps),
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
