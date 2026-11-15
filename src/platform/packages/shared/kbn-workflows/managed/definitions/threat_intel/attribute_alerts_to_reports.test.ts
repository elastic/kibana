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

  it('loads reports for the executing space plus the global catalog', () => {
    const loadStep = findStepByName(workflow.steps, 'load_reports_with_extractions');
    expect(loadStep).toBeDefined();
    const filter = JSON.stringify(loadStep?.with);
    // Space-keyed evidence is what makes including '*' safe: each space
    // writes its own nested element instead of clobbering a shared flat object.
    expect(filter).toContain('"space_id":["{{ variables.spaceId }}","*"]');
  });

  // The scripted per-space upsert (evidence keying, alert_hits-only assignment) moved into
  // write_attribution_evidence.test.ts alongside the internal-user write it now requires --
  // `.kibana-threat-reports` is plugin-owned and hidden, so a plain `elasticsearch.update` step
  // here would run as whichever identity enabled this workflow and 403 for every non-superuser.

  it('writes via an internal route, not a direct elasticsearch step', () => {
    const writeStep = findStepByName(workflow.steps, 'write_evidence');
    expect(writeStep?.type).toBe('kibana.request');
    expect(THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW.yaml).not.toContain('elasticsearch.bulk');
  });

  it('is space-addressed rather than an unconditional default-space call', () => {
    const writeStep = findStepByName(workflow.steps, 'write_evidence');
    expect(writeStep?.with?.path).toBe(
      '/s/{{ workflow.spaceId }}/internal/threat_intel/attribute_alerts_evidence'
    );
  });

  describe('write_evidence renders the attribution-evidence request', () => {
    const engine = createWorkflowLiquidEngine();
    const writeStep = findStepByName(workflow.steps, 'write_evidence');

    const context = {
      variables: {
        layer1_count: 3,
        layer2_count: 4,
        spaceId: 'space-a',
      },
      workflow: { spaceId: 'space-a' },
      foreach: { item: { _id: 'report-1', _index: '.kibana-threat-reports' } },
      now: '2024-06-01T00:00:00.000Z',
    };

    it('renders index, id, and the precomputed evidence fields', () => {
      expect(writeStep).toBeDefined();
      const rendered = renderValueRecursively(engine, writeStep?.with, context) as {
        method: string;
        path: string;
        body: {
          index: string;
          id: string;
          window: string;
          computedAt: string;
          iocMatchHits: number;
          techniqueOverlapHits: number;
          alertHitsTotal: number;
        };
      };

      expect(rendered.method).toBe('POST');
      expect(rendered.path).toBe('/s/space-a/internal/threat_intel/attribute_alerts_evidence');
      expect(rendered.body).toEqual({
        index: '.kibana-threat-reports',
        id: 'report-1',
        window: '7d',
        computedAt: '2024-06-01T00:00:00.000Z',
        iocMatchHits: 3,
        techniqueOverlapHits: 4,
        alertHitsTotal: 7,
      });
    });
  });
});
