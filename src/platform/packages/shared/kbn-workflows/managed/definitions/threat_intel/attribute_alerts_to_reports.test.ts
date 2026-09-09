/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW } from '.';
import { createWorkflowLiquidEngine } from '../../../common/utils/create_workflow_liquid_engine/create_workflow_liquid_engine';

interface WorkflowStep {
  name?: string;
  type?: string;
  steps?: WorkflowStep[];
  with?: Record<string, unknown>;
}

const findStepByName = (
  steps: WorkflowStep[] | undefined,
  name: string
): WorkflowStep | undefined => {
  for (const step of steps ?? []) {
    if (step.name === name) return step;
    const nested = findStepByName(step.steps, name);
    if (nested) return nested;
  }
  return undefined;
};

/**
 * Mirrors `WorkflowTemplatingEngine.evaluateExpression`: drop the leading `$`,
 * then take everything between the first `{{` and the last `}}`.
 */
const evaluateExpression = (
  engine: ReturnType<typeof createWorkflowLiquidEngine>,
  template: string,
  context: Record<string, unknown>
): unknown => {
  const open = template.indexOf('{{');
  const close = template.lastIndexOf('}}');
  return engine.evalValueSync(template.substring(open + 2, close).trim(), context);
};

/**
 * Mirrors `WorkflowTemplatingEngine.renderValueRecursively`: `${{ ... }}` strings
 * are evaluated to typed values, plain strings are rendered, and objects and
 * arrays are walked.
 */
const renderValueRecursively = (
  engine: ReturnType<typeof createWorkflowLiquidEngine>,
  value: unknown,
  context: Record<string, unknown>
): unknown => {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    return value.startsWith('${{') && value.endsWith('}}')
      ? evaluateExpression(engine, value.substring(1), context)
      : engine.parseAndRenderSync(value, context);
  }

  if (Array.isArray(value)) {
    return value.map((item) => renderValueRecursively(engine, item, context));
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        renderValueRecursively(engine, item, context),
      ])
    );
  }

  return value;
};

describe('THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW yaml', () => {
  const workflow = parse(THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW.yaml) as {
    enabled?: boolean;
    steps?: WorkflowStep[];
  };

  it('ships disabled so operators must enable in Workflows management', () => {
    expect(workflow.enabled).toBe(false);
  });

  it('scopes alert queries to the executing space', () => {
    expect(THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW.yaml).toContain(
      '.alerts-security.alerts-{{ variables.spaceId }}'
    );
  });

  /**
   * The bulk-op queueing steps used to pass an inline object literal to `push:`
   * (`push: {'update': {...}}`), which LiquidJS cannot tokenize: it has no object
   * literal syntax in filter arguments, so every pass threw `TokenizationError`
   * at the opening brace. `write_attributions_bulk` carries `on-failure: continue`,
   * so the throw was swallowed and attribution was never written.
   *
   * These render the queueing steps through the real engine. They fail against
   * the inline-literal form and pass once the ops are built in `data.set` steps
   * and pushed as variables.
   */
  describe('bulk op queueing renders through the workflow Liquid engine', () => {
    const engine = createWorkflowLiquidEngine();
    const context = {
      variables: {
        bulk_operations: [],
        layer1_count: 3,
        layer2_count: 4,
      },
      foreach: { item: { _id: 'report-1', _index: '.kibana-threat-reports' } },
      now: '2024-06-01T00:00:00.000Z',
    };

    const renderQueueingStep = (
      buildStepName: string,
      buildVariableName: string,
      queueStepName: string,
      contextOverrides: Record<string, unknown> = {}
    ) => {
      const mergedContext = { ...context, ...contextOverrides };

      // The engine renders each step in order, so the `build_*` step's rendered
      // value is in scope as a variable by the time the queueing step runs.
      const buildStep = findStepByName(workflow.steps, buildStepName);
      expect(buildStep).toBeDefined();
      const built = renderValueRecursively(
        engine,
        buildStep?.with?.[buildVariableName],
        mergedContext
      );

      const queueStep = findStepByName(workflow.steps, queueStepName);
      expect(queueStep).toBeDefined();
      const expression = queueStep?.with?.bulk_operations as string;
      expect(typeof expression).toBe('string');

      return evaluateExpression(engine, expression, {
        ...mergedContext,
        variables: {
          ...(mergedContext.variables as Record<string, unknown>),
          [buildVariableName]: built,
        },
      });
    };

    it('renders the update-action queueing step into a bulk op', () => {
      const ops = renderQueueingStep(
        'build_bulk_update_meta',
        'update_meta',
        'queue_bulk_update_meta'
      ) as Array<Record<string, unknown>>;
      expect(Array.isArray(ops)).toBe(true);
      expect(ops).toHaveLength(1);
      expect(ops[0].update).toEqual(
        expect.objectContaining({ _index: '.kibana-threat-reports', _id: 'report-1' })
      );
    });

    it('renders the document queueing step into a bulk op carrying the hit counts', () => {
      const ops = renderQueueingStep(
        'build_bulk_update_doc',
        'update_doc',
        'queue_bulk_update_doc'
      ) as Array<Record<string, unknown>>;
      expect(Array.isArray(ops)).toBe(true);
      expect(ops).toHaveLength(1);

      const attribution = (ops[0].doc as { attribution: Record<string, unknown> }).attribution;
      expect(attribution.environment_hits).toEqual(
        expect.objectContaining({
          window: '7d',
          layer_1_ioc_match: 3,
          layer_2_behavioral: 4,
        })
      );
      expect(attribution.environment_hits_total).toBe(7);
    });

    it('appends to the existing bulk_operations array rather than replacing it', () => {
      const ops = renderQueueingStep(
        'build_bulk_update_meta',
        'update_meta',
        'queue_bulk_update_meta',
        {
          variables: { ...context.variables, bulk_operations: [{ existing: true }] },
        }
      ) as Array<Record<string, unknown>>;
      expect(ops).toHaveLength(2);
      expect(ops[0]).toEqual({ existing: true });
    });
  });
});
