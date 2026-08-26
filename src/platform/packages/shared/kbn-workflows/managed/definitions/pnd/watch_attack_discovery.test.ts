/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import WATCH_ATTACK_DISCOVERY_YAML from './watch_attack_discovery.yaml';
import { createWorkflowLiquidEngine } from '../../../common/utils/create_workflow_liquid_engine/create_workflow_liquid_engine';

interface WorkflowStep {
  name: string;
  type: string;
  if?: string;
  foreach?: string;
  steps?: WorkflowStep[];
  with?: Record<string, unknown>;
  'on-failure'?: { continue?: boolean };
}

const definition = parse(WATCH_ATTACK_DISCOVERY_YAML) as {
  triggers: Array<{
    inputs?: { properties?: Record<string, { type?: string; default?: unknown }> };
  }>;
  outputs: { properties: Record<string, unknown> };
  steps: WorkflowStep[];
};

const flattenSteps = (steps: WorkflowStep[]): WorkflowStep[] =>
  steps.flatMap((step) => [step, ...flattenSteps(step.steps ?? [])]);

const steps = flattenSteps(definition.steps);
const getStep = (name: string) => steps.find((step) => step.name === name);

describe('Attack Discovery worker', () => {
  it('requests and propagates structured recommended actions', () => {
    expect(WATCH_ATTACK_DISCOVERY_YAML).toContain('name: recommend_actions');
    expect(WATCH_ATTACK_DISCOVERY_YAML).toContain('skill://recommended-actions');
    expect(WATCH_ATTACK_DISCOVERY_YAML).toContain(
      'steps.recommend_actions.output.structured_output.recommended_actions'
    );
    expect(WATCH_ATTACK_DISCOVERY_YAML).toContain(
      'recommended_actions: "${{ variables.recommended_actions }}"'
    );
  });

  it('exposes a disabled-by-default execution kill-switch and execution results', () => {
    expect(definition.triggers[0].inputs?.properties?.execute_actions).toEqual(
      expect.objectContaining({ type: 'boolean', default: false })
    );
    expect(definition.outputs.properties).toHaveProperty('executed_actions');
    expect(WATCH_ATTACK_DISCOVERY_YAML).toContain(
      'executed_actions: "${{ variables.executed_actions }}"'
    );
  });

  it('pauses once per discovery with a static six-action review schema', () => {
    const reviewActions = getStep('review_actions');
    const reviewSchema = reviewActions?.with?.schema as
      | { properties?: Record<string, unknown>; required?: string[] }
      | undefined;

    expect(reviewActions).toEqual(
      expect.objectContaining({
        type: 'waitForInput',
        if: expect.stringContaining('has_kibana_actions'),
      })
    );
    expect(Object.keys(reviewSchema?.properties ?? {})).toEqual([
      'create_case',
      'set_asset_criticality',
      'isolate_host',
      'kill_process',
      'hunt_process_persistence',
      'analyze_exfiltration_ips',
    ]);
    expect(reviewSchema?.required).toHaveLength(6);
  });

  it('resolves endpoint agents and isolates every API failure', () => {
    expect(getStep('resolve_endpoint_agent_ids')).toEqual(
      expect.objectContaining({
        type: 'elasticsearch.esql.query',
        'on-failure': { continue: true },
      })
    );

    for (const stepName of [
      'create_case',
      'set_host_asset_criticality',
      'set_user_asset_criticality',
      'isolate_host',
      'kill_process',
      'hunt_process_persistence',
    ]) {
      expect(getStep(stepName)).toEqual(
        expect.objectContaining({
          type: 'kibana.request',
          'on-failure': { continue: true },
        })
      );
    }
  });

  it('renders target-scoped endpoint resolution and agent selection', () => {
    const liquidEngine = createWorkflowLiquidEngine({ strictFilters: true });
    const resolveQuery = getStep('resolve_endpoint_agent_ids')?.with?.query as string;
    const recommendedActions = [
      {
        action_type: 'isolate_host',
        targets: { hosts: ['host-1'] },
      },
      {
        action_type: 'create_case',
        targets: { hosts: ['case-only-host'] },
      },
    ];
    const renderedQuery = liquidEngine.parseAndRenderSync(resolveQuery, {
      steps: {
        recommend_actions: {
          output: { structured_output: { recommended_actions: recommendedActions } },
        },
      },
    });

    expect(renderedQuery).toContain('"host-1"');
    expect(renderedQuery).not.toContain('case-only-host');
    expect(renderedQuery).toContain('FROM metrics-endpoint.metadata_current_*');
    expect(renderedQuery).not.toContain('DEDUP');

    const selectedIds = liquidEngine.parseAndRenderSync(
      '{{ rows | where_exp: "row", "foreach.item.targets.hosts contains row.1" | map: "0" | uniq | json }}',
      {
        rows: [
          ['agent-1', 'host-1'],
          ['agent-2', 'host-2'],
          ['agent-2', 'host-2'],
        ],
        foreach: { item: { targets: { hosts: ['host-2'] } } },
      }
    );
    expect(JSON.parse(selectedIds)).toEqual(['agent-2']);
  });

  it('appends YAML-built execution records by reference', () => {
    const recordSteps = steps.filter((step) => step.name.startsWith('record_'));
    expect(recordSteps).toHaveLength(18);

    for (const recordStep of recordSteps) {
      const appendExpression = recordStep.with?.discovery_executed_actions;
      expect(appendExpression).toEqual(expect.stringContaining('| push: steps.build_'));
      expect(appendExpression).not.toEqual(expect.stringContaining('| concat: ['));
    }

    const appendTemplate = getStep('record_create_case_success')?.with
      ?.discovery_executed_actions as string;
    const expression = appendTemplate.replace(/^\s*\$\{\{\s*/, '').replace(/\s*\}\}\s*$/, '');
    const previousRecord = { action_type: 'previous', status: 'succeeded' };
    const newRecord = { action_type: 'create_case', status: 'succeeded' };
    const liquidEngine = createWorkflowLiquidEngine({ strictFilters: true });

    expect(
      liquidEngine.evalValueSync(expression, {
        variables: { discovery_executed_actions: [previousRecord] },
        steps: {
          build_create_case_success_record: {
            output: { execution_record: newRecord },
          },
        },
      })
    ).toEqual([previousRecord, newRecord]);
  });

  it('gates executable action loops on the kill-switch and review toggles', () => {
    for (const [stepName, toggle] of [
      ['execute_create_case_actions', 'create_case'],
      ['execute_set_asset_criticality_actions', 'set_asset_criticality'],
      ['execute_isolate_host_actions', 'isolate_host'],
      ['execute_kill_process_actions', 'kill_process'],
      ['execute_hunt_process_persistence_actions', 'hunt_process_persistence'],
    ]) {
      const step = getStep(stepName);
      expect(step?.if).toContain('inputs.execute_actions == true');
      expect(step?.if).toContain(`response.${toggle} == true`);
    }
  });

  it('renders both execution classes in each investigation', () => {
    expect(WATCH_ATTACK_DISCOVERY_YAML).toContain('"Kibana-executable"');
    expect(WATCH_ATTACK_DISCOVERY_YAML).toContain('"Manual analyst actions"');
    expect(WATCH_ATTACK_DISCOVERY_YAML).toContain(
      '{{ steps.recommend_actions.output.structured_output.recommended_actions | json }}'
    );
    expect(WATCH_ATTACK_DISCOVERY_YAML).toContain(
      '{{ variables.discovery_executed_actions | json }}'
    );
  });
});
