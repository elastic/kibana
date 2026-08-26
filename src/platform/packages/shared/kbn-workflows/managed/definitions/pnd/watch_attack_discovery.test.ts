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

// Strips the leading "${{" / trailing "}}" so a step's `if`/`with` template
// string can be evaluated directly as a Liquid value expression.
const stripExpression = (raw: string): string =>
  raw.replace(/^\s*\$\{\{\s*/, '').replace(/\s*\}\}\s*$/, '');

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

  it('hardens recommend_actions against tool hallucination and load_skill failures', () => {
    const recommendActions = getStep('recommend_actions');
    expect(recommendActions).toEqual(
      expect.objectContaining({
        type: 'ai.agent',
        'on-failure': { continue: true },
      })
    );
    expect(recommendActions?.with?.message).toEqual(expect.stringContaining('load_skill'));
    expect(recommendActions?.with?.configuration_overrides).toEqual({
      skill_ids: ['recommended-actions'],
      enable_elastic_capabilities: false,
    });

    // Every downstream reference in this iteration must read the guarded
    // variable, not the (possibly-failed) step output directly.
    expect(getStep('capture_recommended_actions')?.with?.discovery_recommended_actions).toEqual(
      expect.stringContaining('| default: consts.no_rows')
    );
    for (const stepName of [
      'collect_recommended_actions',
      'compute_action_flags',
      'execute_create_case_actions',
      'execute_set_asset_criticality_actions',
      'execute_isolate_host_actions',
      'execute_kill_process_actions',
      'execute_hunt_process_persistence_actions',
      'account_unexecuted_actions',
    ]) {
      const step = getStep(stepName);
      const templateSource = JSON.stringify(step?.with ?? step?.foreach ?? '');
      expect(templateSource).toContain('variables.discovery_recommended_actions');
    }
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
    for (const stepName of ['resolve_endpoint_agent_ids', 'resolve_case_alert_rows']) {
      expect(getStep(stepName)).toEqual(
        expect.objectContaining({
          type: 'elasticsearch.esql.query',
          'on-failure': { continue: true },
        })
      );
    }

    for (const stepName of [
      'create_case',
      'attach_case_alert',
      'add_case_host_observable',
      'add_case_ip_observable',
      'resolve_host_entity',
      'set_host_asset_criticality',
      'resolve_user_entity',
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
      variables: { discovery_recommended_actions: recommendedActions },
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

  it('attaches source alerts and host/IP observables to newly created cases', () => {
    expect(getStep('resolve_case_alert_rows')?.with?.query).toEqual(
      expect.stringContaining('FROM .alerts-security.alerts-{{ workflow.spaceId }}')
    );
    expect(getStep('attach_case_alert')?.with?.path).toEqual(
      expect.stringContaining('/api/cases/{{ steps.create_case.output.id }}/comments')
    );
    expect(getStep('add_case_host_observable')?.with?.path).toEqual(
      expect.stringContaining('/api/cases/{{ steps.create_case.output.id }}/observables')
    );

    const hostObservableBody = getStep('add_case_host_observable')?.with?.body as {
      observable?: { typeKey?: string };
    };
    expect(hostObservableBody.observable?.typeKey).toBe('observable-type-hostname');

    const ipObservableBody = getStep('add_case_ip_observable')?.with?.body as {
      observable?: { typeKey?: string };
    };
    const liquidEngine = createWorkflowLiquidEngine({ strictFilters: true });
    const ipTypeKeyTemplate = ipObservableBody.observable?.typeKey as string;
    expect(
      liquidEngine.parseAndRenderSync(ipTypeKeyTemplate, { foreach: { item: '10.0.0.1' } })
    ).toBe('observable-type-ipv4');
    expect(
      liquidEngine.parseAndRenderSync(ipTypeKeyTemplate, { foreach: { item: 'fe80::1' } })
    ).toBe('observable-type-ipv6');
  });

  it('resolves entity.id via Entity Store v2 before writing asset criticality', () => {
    for (const [resolveStepName, filterField] of [
      ['resolve_host_entity', 'host.name'],
      ['resolve_user_entity', 'user.name'],
    ] as const) {
      const resolveStep = getStep(resolveStepName);
      expect(resolveStep?.with?.method).toBe('GET');
      expect(resolveStep?.with?.path).toBe(
        '/s/{{ workflow.spaceId }}/api/security/entity_store/entities'
      );
      const query = resolveStep?.with?.query as { filterQuery?: string };
      expect(query.filterQuery).toContain(filterField);
    }

    for (const setStepName of ['set_host_asset_criticality', 'set_user_asset_criticality']) {
      const setStep = getStep(setStepName);
      expect(setStep?.with?.method).toBe('PUT');
      expect(setStep?.with?.path).toBe(
        '/s/{{ workflow.spaceId }}/api/security/entity_store/entities/bulk'
      );
      expect((setStep?.with?.query as { force?: boolean })?.force).toBe(true);
    }

    expect(getStep('record_host_asset_criticality_missing_entity')).toBeDefined();
    expect(getStep('record_user_asset_criticality_missing_entity')).toBeDefined();
  });

  it('appends YAML-built execution records by reference', () => {
    const recordSteps = steps.filter((step) => step.name.startsWith('record_'));
    expect(recordSteps).toHaveLength(30);

    for (const recordStep of recordSteps) {
      const appendExpression = recordStep.with?.discovery_executed_actions;
      expect(appendExpression).toEqual(expect.stringContaining('| push: steps.build_'));
      expect(appendExpression).not.toEqual(expect.stringContaining('| concat: ['));
    }

    const appendTemplate = getStep('record_create_case_success')?.with
      ?.discovery_executed_actions as string;
    const expression = stripExpression(appendTemplate);
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

  it('accounts for every unexecuted recommendation with a reason', () => {
    const liquidEngine = createWorkflowLiquidEngine({ strictFilters: true });
    const evalIf = (stepName: string, context: Record<string, unknown>) => {
      const raw = getStep(stepName)?.if as string;
      return liquidEngine.evalValueSync(stripExpression(raw), context);
    };

    expect(
      evalIf('build_manual_action_record', { foreach: { item: { execution: 'manual' } } })
    ).toBe(true);
    expect(
      evalIf('build_manual_action_record', { foreach: { item: { execution: 'kibana_api' } } })
    ).toBe(false);
    expect(getStep('build_manual_action_record')?.with?.execution_record).toEqual(
      expect.objectContaining({ status: 'not_executed', reason: expect.stringContaining('manual') })
    );

    expect(
      evalIf('build_surfaced_only_record', {
        foreach: { item: { action_type: 'analyze_exfiltration_ips' } },
      })
    ).toBe(true);
    expect(
      evalIf('build_surfaced_only_record', { foreach: { item: { action_type: 'isolate_host' } } })
    ).toBe(false);
    expect(getStep('build_surfaced_only_record')?.with?.execution_record).toEqual(
      expect.objectContaining({
        status: 'not_executed',
        reason: expect.stringContaining('surfaced-only'),
      })
    );

    const kibanaApiIsolateHost = { execution: 'kibana_api', action_type: 'isolate_host' };
    expect(
      evalIf('build_kill_switch_disabled_record', {
        foreach: { item: kibanaApiIsolateHost },
        inputs: { execute_actions: false },
      })
    ).toBe(true);
    expect(
      evalIf('build_kill_switch_disabled_record', {
        foreach: { item: kibanaApiIsolateHost },
        inputs: { execute_actions: true },
      })
    ).toBe(false);
    expect(getStep('build_kill_switch_disabled_record')?.with?.execution_record).toEqual(
      expect.objectContaining({
        status: 'not_executed',
        reason: expect.stringContaining('kill-switch'),
      })
    );

    expect(
      evalIf('build_not_approved_record', {
        foreach: { item: kibanaApiIsolateHost },
        inputs: { execute_actions: true },
        steps: { review_actions: { output: { response: { isolate_host: false } } } },
      })
    ).toBe(true);
    expect(
      evalIf('build_not_approved_record', {
        foreach: { item: kibanaApiIsolateHost },
        inputs: { execute_actions: true },
        steps: { review_actions: { output: { response: { isolate_host: true } } } },
      })
    ).toBe(false);
    expect(getStep('build_not_approved_record')?.with?.execution_record).toEqual(
      expect.objectContaining({
        status: 'not_executed',
        reason: expect.stringContaining('not approved'),
      })
    );
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
      '{{ variables.discovery_recommended_actions | json }}'
    );
    expect(WATCH_ATTACK_DISCOVERY_YAML).toContain(
      '{{ variables.discovery_executed_actions | json }}'
    );
  });
});
