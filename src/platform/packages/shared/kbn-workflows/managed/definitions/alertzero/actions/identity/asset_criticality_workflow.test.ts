/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import {
  ALERTZERO_ACTION_SET_ASSET_CRITICALITY_WORKFLOW,
  ALERTZERO_ACTION_SET_ASSET_CRITICALITY_WORKFLOW_ID,
} from './action_set_asset_criticality';
import { ALERTZERO_ACTION_WORKFLOW_IDS } from '../..';
import { WorkflowSchema } from '../../../../../spec/schema';

/**
 * The first identity-scoped action. It probes Entity Analytics privilege,
 * reads the current level so the approver can revert, then upserts via the
 * public asset criticality API. The YAML is the source of truth; this suite
 * pins the pre-flight, the request contract, and the catalog shape.
 */

interface YamlStep {
  name: string;
  type: string;
  condition?: string;
  'on-failure'?: { continue?: boolean };
  with?: Record<string, unknown>;
  steps?: YamlStep[];
  else?: YamlStep[];
}

interface YamlWorkflow {
  tags?: string[];
  consts?: {
    actionMetadata?: {
      category?: string;
      impact?: string;
      reversible?: boolean;
      subject?: string | string[];
    };
  };
  triggers: Array<{
    inputs?: {
      properties?: {
        actionInput?: {
          properties?: Record<string, { enum?: string[]; default?: string }>;
          required?: string[];
        };
      };
    };
  }>;
  outputs?: Array<{ name: string; type?: string }>;
  steps: YamlStep[];
}

const flatten = (steps: YamlStep[]): YamlStep[] =>
  steps.flatMap((step) => [step, ...flatten(step.steps ?? []), ...flatten(step.else ?? [])]);

const parsed = parse(ALERTZERO_ACTION_SET_ASSET_CRITICALITY_WORKFLOW.yaml) as YamlWorkflow;
const allSteps = flatten(parsed.steps);
const stepByName = (name: string) => allSteps.find((step) => step.name === name);
const headersOf = (step?: YamlStep) => step?.with?.headers as Record<string, string> | undefined;

describe('AlertZero set asset criticality workflow', () => {
  it('is in the AlertZero action install set and carries the action tags', () => {
    expect(ALERTZERO_ACTION_WORKFLOW_IDS).toContain(
      ALERTZERO_ACTION_SET_ASSET_CRITICALITY_WORKFLOW_ID
    );
    expect(parsed.tags).toEqual(expect.arrayContaining(['action', 'alertzero']));
  });

  it('passes strict workflow schema validation', () => {
    const result = WorkflowSchema.safeParse(
      parse(ALERTZERO_ACTION_SET_ASSET_CRITICALITY_WORKFLOW.yaml)
    );

    expect(result.success ? null : result.error.issues).toBeNull();
  });

  it('declares a low-impact, reversible respond action on users and services', () => {
    expect(parsed.consts?.actionMetadata).toEqual(
      expect.objectContaining({
        category: 'respond',
        impact: 'low',
        reversible: true,
        subject: ['user', 'service'],
      })
    );
  });

  it('takes the asset criticality record fields as actionInput', () => {
    const actionInput = parsed.triggers[0]?.inputs?.properties?.actionInput;

    expect(actionInput?.required).toEqual(['id_field', 'id_value']);
    expect(actionInput?.properties?.id_field.enum).toEqual(['user.name', 'service.name']);
    expect(actionInput?.properties?.criticality_level.enum).toEqual([
      'low_impact',
      'medium_impact',
      'high_impact',
      'extreme_impact',
    ]);
    expect(actionInput?.properties?.criticality_level.default).toBe('high_impact');
  });

  it('space-scopes every kibana.request path', () => {
    const requestSteps = allSteps.filter((step) => step.type === 'kibana.request');
    const unscoped = requestSteps.filter(
      (step) => !String(step.with?.path ?? '').startsWith('/s/{{ workflow.spaceId }}/')
    );

    expect(requestSteps.length).toBeGreaterThan(0);
    expect(unscoped.map((step) => step.name)).toEqual([]);
  });

  it('probes Entity Analytics privilege and fails closed before writing', () => {
    const probeIndex = parsed.steps.findIndex((step) => step.name === 'probe_privileges');
    const dispatchIndex = parsed.steps.findIndex((step) => step.name === 'dispatch');
    const probe = stepByName('probe_privileges');
    const gate = stepByName('fail_if_missing_privileges');
    const fail = stepByName('missing_asset_criticality_privilege');

    expect(probe?.with?.method).toBe('GET');
    expect(probe?.with?.path).toBe(
      '/s/{{ workflow.spaceId }}/internal/asset_criticality/privileges'
    );
    expect(headersOf(probe)?.['elastic-api-version']).toBe('1');
    expect(probe?.['on-failure']).toEqual({ continue: true });

    expect(gate?.type).toBe('if');
    expect(gate?.condition).toContain('has_all_required != true');
    expect(fail?.type).toBe('workflow.fail');

    expect(probeIndex).toBeGreaterThanOrEqual(0);
    expect(probeIndex).toBeLessThan(dispatchIndex);
  });

  it('reads the previous level without failing on 404 so the result can say what changed', () => {
    const readPrevious = stepByName('read_previous');
    const capture = stepByName('capture_previous');

    expect(readPrevious?.with?.method).toBe('GET');
    expect(readPrevious?.with?.path).toContain('/api/asset_criticality?id_field=');
    expect(readPrevious?.with?.path).toContain('inputs.actionInput.id_value | url_encode');
    expect(readPrevious?.['on-failure']).toEqual({ continue: true });
    expect(capture?.with?.previous_level).toContain('steps.read_previous.output.data.criticality_level');
  });

  it('upserts through the public API with the versioned header, wait_for refresh, and no retry', () => {
    const dispatch = stepByName('dispatch');
    const body = dispatch?.with?.body as Record<string, string> | undefined;

    expect(dispatch?.type).toBe('kibana.request');
    expect(dispatch?.with?.method).toBe('POST');
    expect(dispatch?.with?.path).toBe('/s/{{ workflow.spaceId }}/api/asset_criticality');
    expect(headersOf(dispatch)?.['elastic-api-version']).toBe('2023-10-31');
    expect(body).toEqual({
      id_field: '{{ inputs.actionInput.id_field }}',
      id_value: '{{ inputs.actionInput.id_value }}',
      criticality_level: '{{ variables.criticality_level }}',
      refresh: 'wait_for',
    });
    expect(dispatch?.['on-failure']).toBeUndefined();
  });

  it('emits the record, the previous level, and a revert hint', () => {
    const emit = stepByName('emit_result');
    const outputNames = (parsed.outputs ?? []).map((output) => output.name);

    expect(emit?.type).toBe('workflow.output');
    expect(outputNames).toEqual([
      'id_field',
      'id_value',
      'criticality_level',
      'previous_level',
      'message',
    ]);
    expect(emit?.with?.previous_level).toBe('{{ variables.previous_level }}');
    expect(emit?.with?.message).toContain('DELETE /api/asset_criticality');
  });
});
