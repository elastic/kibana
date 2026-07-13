/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { z } from '@kbn/zod/v4';
import { managedWorkflowDefinitions } from '.';
import type { ManagedWorkflowTemplateValuesById } from '.';
import {
  EXAMPLE_MANAGED_WORKFLOW_ID,
  SECURITY_ALERT_ANALYSIS_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID,
} from './definitions';
import type { ManagedWorkflowDefinition, ManagedWorkflowTemplateValues } from './types';
import { getInputsFromDefinition } from '../spec/lib/field_conversion';
import { WorkflowSchemaBase } from '../spec/schema';
import type { WorkflowYaml } from '../spec/schema';

const ManagedWorkflowSchema = WorkflowSchemaBase.extend({
  triggers: z.array(z.object({ type: z.string().min(1) }).passthrough()).min(1),
});

type RegistryManagedWorkflowDefinition = (typeof managedWorkflowDefinitions)[number];
type TemplateManagedWorkflowDefinition<TDefinition> = TDefinition extends {
  yamlTemplate: (values: infer _TValues) => string;
}
  ? TDefinition
  : never;
type RegistryTemplateManagedWorkflowDefinition =
  TemplateManagedWorkflowDefinition<RegistryManagedWorkflowDefinition>;
type YamlTemplateManagedWorkflowDefinition = ManagedWorkflowDefinition & {
  yamlTemplate: (values: ManagedWorkflowTemplateValues) => string;
};

const templateRepresentativeValuesById: ManagedWorkflowTemplateValuesById = {
  [EXAMPLE_MANAGED_WORKFLOW_ID]: {
    recipient: 'World',
  },
  [SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID]: {
    detectionIntervalMinutes: 30,
  },
  [SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID]: {
    reviewIntervalMinutes: 10,
    discoveryBatchSize: 3,
    triageBatchSize: 5,
    maxReviewPasses: 3,
  },
};

const templateValuesLookup = templateRepresentativeValuesById as Record<
  string,
  ManagedWorkflowTemplateValues | undefined
>;

const managedDefinitionsById: Array<[string, RegistryManagedWorkflowDefinition]> =
  managedWorkflowDefinitions.map((definition) => [definition.id, definition]);
const managedTemplateDefinitionsById: Array<[string, RegistryTemplateManagedWorkflowDefinition]> =
  managedDefinitionsById.filter(
    (definitionEntry): definitionEntry is [string, RegistryTemplateManagedWorkflowDefinition] =>
      hasYamlTemplate(definitionEntry[1])
  );

function hasYamlTemplate(
  definition: ManagedWorkflowDefinition
): definition is YamlTemplateManagedWorkflowDefinition {
  return typeof definition.yamlTemplate === 'function';
}

function hasYaml(
  definition: ManagedWorkflowDefinition
): definition is ManagedWorkflowDefinition & { yaml: string } {
  return typeof definition.yaml === 'string';
}

function renderWorkflowYaml(definition: ManagedWorkflowDefinition): string {
  const { id } = definition;

  if (hasYaml(definition)) {
    return definition.yaml;
  }

  if (!hasYamlTemplate(definition)) {
    throw new Error(`Managed workflow '${id}' must define either yaml or yamlTemplate`);
  }

  const representativeValues = templateValuesLookup[definition.id];
  if (!representativeValues) {
    throw new Error(
      `Missing representative template values for managed workflow '${definition.id}'. Add an entry to templateRepresentativeValuesById.`
    );
  }

  return definition.yamlTemplate(representativeValues);
}

function assertWorkflowYamlIsValid(workflowId: string, yamlContent: string): void {
  let parsedYaml: unknown;
  try {
    parsedYaml = parse(yamlContent);
  } catch (error) {
    throw new Error(
      `Managed workflow '${workflowId}' has invalid YAML: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  const validationResult = ManagedWorkflowSchema.safeParse(parsedYaml);
  if (!validationResult.success) {
    throw new Error(
      `Managed workflow '${workflowId}' failed workflow schema validation: ${validationResult.error.message}`
    );
  }
}

const WORKFLOW_EXECUTE_STEP_TYPES = new Set(['workflow.execute', 'workflow.executeAsync']);

interface WorkflowExecuteStepNode {
  name?: unknown;
  type: string;
  with?: {
    'workflow-id'?: unknown;
    inputs?: Record<string, unknown>;
  };
}

function isWorkflowExecuteStepNode(node: unknown): node is WorkflowExecuteStepNode {
  return (
    typeof node === 'object' &&
    node !== null &&
    typeof (node as { type?: unknown }).type === 'string' &&
    WORKFLOW_EXECUTE_STEP_TYPES.has((node as { type: string }).type)
  );
}

/**
 * Recursively walks a parsed workflow's `steps` tree (including steps nested under
 * `foreach`/`if`/etc.) and collects every `workflow.execute` / `workflow.executeAsync` step,
 * regardless of nesting depth or the container step type that holds it.
 */
function collectWorkflowExecuteSteps(
  node: unknown,
  results: WorkflowExecuteStepNode[] = []
): WorkflowExecuteStepNode[] {
  if (Array.isArray(node)) {
    for (const item of node) {
      collectWorkflowExecuteSteps(item, results);
    }
    return results;
  }

  if (node && typeof node === 'object') {
    if (isWorkflowExecuteStepNode(node)) {
      results.push(node);
    }
    for (const value of Object.values(node)) {
      collectWorkflowExecuteSteps(value, results);
    }
  }

  return results;
}

/**
 * For every workflow.execute / workflow.executeAsync step that targets another managed
 * workflow (by id, resolvable at build time), asserts the step's `with.inputs` covers all of
 * the target workflow's required manual-trigger inputs. Steps targeting a workflow id that
 * isn't in the managed registry (e.g. a user-authored workflow) are skipped, since their
 * required inputs can't be resolved statically.
 *
 * Guards against drift like a caller only ever exercising a subset of the target's required
 * inputs, which manual/UI-triggered calls to the same workflow can mask.
 */
function assertWorkflowExecuteStepsSupplyRequiredInputs(
  sourceWorkflowId: string,
  steps: WorkflowExecuteStepNode[]
): void {
  const resolvableStepTargetPairs = steps
    .map((step) => {
      const targetId = step.with?.['workflow-id'];
      const targetEntry =
        typeof targetId === 'string'
          ? managedDefinitionsById.find(([defId]) => defId === targetId)
          : undefined;

      return targetEntry ? { step, targetId, targetDefinition: targetEntry[1] } : undefined;
    })
    .filter((pair): pair is NonNullable<typeof pair> => pair !== undefined);

  for (const { step, targetId, targetDefinition } of resolvableStepTargetPairs) {
    const targetYaml = renderWorkflowYaml(targetDefinition);
    const targetParsed = parse(targetYaml) as WorkflowYaml;
    const inputsSchema = getInputsFromDefinition(targetParsed);
    const requiredInputNames = inputsSchema?.required ?? [];

    const providedInputNames = Object.keys(step.with?.inputs ?? {});
    const missingInputNames = requiredInputNames.filter(
      (name) => !providedInputNames.includes(name)
    );

    if (missingInputNames.length > 0) {
      throw new Error(
        `Managed workflow '${sourceWorkflowId}' step '${String(
          step.name
        )}' calls '${targetId}' via workflow.execute(Async) but does not supply its required input(s): ${missingInputNames.join(
          ', '
        )}. The target workflow will reject this call at runtime with an InputValidationError.`
      );
    }
  }
}

describe('managedWorkflowDefinitions', () => {
  it('contains unique workflow ids', () => {
    const ids = managedWorkflowDefinitions.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('contains the Security alert analysis workflow', () => {
    const ids = managedWorkflowDefinitions.map(({ id }) => id);
    expect(ids).toContain(SECURITY_ALERT_ANALYSIS_WORKFLOW_ID);
  });

  it.each(managedDefinitionsById)('%s uses the reserved system- id prefix', (id) => {
    expect(id.startsWith('system-')).toBe(true);
  });

  it.each(managedDefinitionsById)('%s declares an explicit pluginId', (_id, definition) => {
    expect(typeof definition.pluginId).toBe('string');
    expect(definition.pluginId.trim()).not.toHaveLength(0);
  });

  it.each(managedDefinitionsById)(
    '%s declares a version that is a positive integer',
    (_id, definition) => {
      expect(typeof definition.version).toBe('number');
      expect(Number.isInteger(definition.version)).toBe(true);
      expect(definition.version).toBeGreaterThanOrEqual(1);
    }
  );

  it.each(managedDefinitionsById)('%s declares whether it is billable', (_id, definition) => {
    expect(typeof definition.billable).toBe('boolean');
  });

  it.each(managedDefinitionsById)(
    '%s defines exactly one source field: yaml xor yamlTemplate',
    (_id, definition) => {
      const hasYamlField = hasYaml(definition);
      const hasYamlTemplateField = hasYamlTemplate(definition);

      expect(hasYamlField || hasYamlTemplateField).toBe(true);
      expect(hasYamlField && hasYamlTemplateField).toBe(false);
    }
  );

  it('defines representative template values for every yamlTemplate workflow', () => {
    const templatedIds = managedTemplateDefinitionsById.map(([id]) => id).sort();
    const representedIds = Object.keys(templateRepresentativeValuesById).sort();

    expect(representedIds).toEqual(templatedIds);
  });

  it.each(managedDefinitionsById)(
    '%s parses and validates as a workflow definition',
    (id, definition) => {
      const renderedYaml = renderWorkflowYaml(definition);
      assertWorkflowYamlIsValid(id, renderedYaml);
    }
  );

  it.each(managedTemplateDefinitionsById)(
    '%s yamlTemplate renders cleanly with representative values',
    (id, definition) => {
      const renderedYaml = renderWorkflowYaml(definition);

      expect(typeof renderedYaml).toBe('string');
      expect(renderedYaml.trim()).not.toHaveLength(0);
      expect(renderedYaml).not.toContain('undefined');
      assertWorkflowYamlIsValid(id, renderedYaml);
    }
  );
});

describe('managed workflow cross-references', () => {
  it.each(managedDefinitionsById)(
    '%s workflow.execute/executeAsync steps supply every required input of their target managed workflow',
    (id, definition) => {
      const renderedYaml = renderWorkflowYaml(definition);
      const parsedYaml = parse(renderedYaml) as { steps?: unknown };
      const executeSteps = collectWorkflowExecuteSteps(parsedYaml.steps);

      assertWorkflowExecuteStepsSupplyRequiredInputs(id, executeSteps);
    }
  );
});
