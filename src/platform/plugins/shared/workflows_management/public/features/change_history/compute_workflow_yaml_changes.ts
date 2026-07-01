/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { stableStringify } from '@kbn/std';
import {
  stripNestedStepContentForComparison,
  visitNestedSteps,
  WorkflowSchemaForAutocomplete,
} from '@kbn/workflows';
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
type ParsedWorkflowTrigger = ParsedWorkflowYaml['triggers'][number];

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

const flattenSteps = (steps: ParsedWorkflowYaml['steps']): FlattenedStep[] => {
  if (!steps) {
    return [];
  }

  const flattened: FlattenedStep[] = [];
  visitNestedSteps(
    steps,
    (entry) => {
      flattened.push({
        path: entry.path,
        name: entry.name,
        step: entry.step,
      });
    },
    { requireValidName: true }
  );

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

interface TriggerMultisetEntry {
  trigger: ParsedWorkflowTrigger;
  count: number;
}

const buildTriggerMultiset = (
  triggers: ParsedWorkflowYaml['triggers']
): Map<string, TriggerMultisetEntry> => {
  const multiset = new Map<string, TriggerMultisetEntry>();

  for (const trigger of triggers) {
    const key = stableStringify(trigger);
    const existing = multiset.get(key);

    if (existing) {
      existing.count += 1;
    } else {
      multiset.set(key, { trigger, count: 1 });
    }
  }

  return multiset;
};

const expandUnmatchedTriggers = (
  multiset: Map<string, TriggerMultisetEntry>,
  otherMultiset: Map<string, TriggerMultisetEntry>
): ParsedWorkflowTrigger[] => {
  const unmatched: ParsedWorkflowTrigger[] = [];

  for (const [key, entry] of multiset) {
    const otherCount = otherMultiset.get(key)?.count ?? 0;
    const excessCount = entry.count - Math.min(entry.count, otherCount);

    for (let index = 0; index < excessCount; index += 1) {
      unmatched.push(entry.trigger);
    }
  }

  return unmatched;
};

const groupTriggersByType = (
  triggers: ParsedWorkflowTrigger[]
): Map<string, ParsedWorkflowTrigger[]> => {
  const groups = new Map<string, ParsedWorkflowTrigger[]>();

  for (const trigger of triggers) {
    const existing = groups.get(trigger.type) ?? [];
    existing.push(trigger);
    groups.set(trigger.type, existing);
  }

  return groups;
};

const compareTriggers = (
  baseline: ParsedWorkflowYaml['triggers'],
  target: ParsedWorkflowYaml['triggers']
): WorkflowDefinitionChange[] => {
  const changes: WorkflowDefinitionChange[] = [];
  const baselineTriggers = buildTriggerMultiset(baseline);
  const targetTriggers = buildTriggerMultiset(target);
  const baselineUnmatched = expandUnmatchedTriggers(baselineTriggers, targetTriggers);
  const targetUnmatched = expandUnmatchedTriggers(targetTriggers, baselineTriggers);
  const baselineByType = groupTriggersByType(baselineUnmatched);
  const targetByType = groupTriggersByType(targetUnmatched);
  const triggerTypes = new Set([...baselineByType.keys(), ...targetByType.keys()]);

  for (const triggerType of triggerTypes) {
    const baselineOfType = baselineByType.get(triggerType) ?? [];
    const targetOfType = targetByType.get(triggerType) ?? [];
    const modifiedCount = Math.min(baselineOfType.length, targetOfType.length);

    for (let index = 0; index < modifiedCount; index += 1) {
      changes.push({
        kind: 'trigger_modified',
        label: triggerType,
      });
    }

    for (let index = modifiedCount; index < baselineOfType.length; index += 1) {
      changes.push({
        kind: 'trigger_removed',
        label: triggerType,
      });
    }

    for (let index = modifiedCount; index < targetOfType.length; index += 1) {
      changes.push({
        kind: 'trigger_added',
        label: triggerType,
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
    } else if (
      stableStringify(stripNestedStepContentForComparison(baselineEntry.step)) !==
      stableStringify(stripNestedStepContentForComparison(targetEntry.step))
    ) {
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
