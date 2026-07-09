/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { SECURITY_ALERT_ANALYSIS_SINGLE_WORKFLOW_ID, SECURITY_ALERT_ANALYSIS_WORKFLOW } from '.';
import { WorkflowGraph } from '../../../graph';
import type { WorkflowYaml } from '../../../spec/schema';

const findStepByName = (steps: unknown[], name: string): Record<string, unknown> | undefined => {
  for (const step of steps) {
    const s = step as Record<string, unknown>;
    if (s.name === name) return s;
    for (const key of ['steps', 'else']) {
      const nested = s[key];
      if (Array.isArray(nested)) {
        const found = findStepByName(nested, name);
        if (found) return found;
      }
    }
  }
  return undefined;
};

describe('SECURITY_ALERT_ANALYSIS_WORKFLOW yaml (parent fan-out)', () => {
  // The workflow is installed statically (no template rendering); it reads per-space config at run
  // time. These assertions run against the static yaml the definition ships.
  const workflow = parse(SECURITY_ALERT_ANALYSIS_WORKFLOW.yaml) as {
    consts: Record<string, unknown>;
    steps: unknown[];
  };

  it('reads per-space config at run time from the space-scoped runtime_config route', () => {
    const fetchStep = findStepByName(workflow.steps, 'fetch_runtime_config') as {
      type: string;
      with: { method: string; path: string };
    };

    expect(fetchStep).toBeDefined();
    expect(fetchStep.type).toBe('kibana.request');
    expect(fetchStep.with.method).toBe('GET');
    // Raw kibana.request is not space-scoped automatically, so the path must be prefixed with the
    // execution's space to read the invoking space's settings, not the default space's.
    expect(fetchStep.with.path).toBe(
      '/s/{{ workflow.spaceId }}/internal/security_solution/alert_analysis_workflow/runtime_config'
    );
  });

  it('reads the tag prefix from runtime config and does not bake it into consts', () => {
    // The tag prefix is per-space and configurable via uiSettings, so it must be read at run time,
    // not derived from a const namespace baked into the document.
    expect(workflow.consts.workflow_tag_namespace).toBeUndefined();

    const runtimeConfigStep = findStepByName(workflow.steps, 'set_runtime_config_variables') as {
      with: { tag_prefix: string };
    };
    expect(runtimeConfigStep).toBeDefined();
    expect(runtimeConfigStep.with.tag_prefix).toBe(
      '{{ steps.fetch_runtime_config.output.tagPrefix }}'
    );
  });

  it('does not bake connector/auto-close/create-conversation config into consts', () => {
    // These are per-space and read at run time; leaving stale literals here (e.g. a dev connector
    // id) would be misleading and unused.
    expect(workflow.consts.connector_id).toBeUndefined();
    expect(workflow.consts.auto_close_enabled).toBeUndefined();
    expect(workflow.consts.auto_close_confidence_score_min_threshold).toBeUndefined();
    expect(workflow.consts.auto_close_confidence_score_max_threshold).toBeUndefined();
    expect(workflow.consts.create_conversation).toBeUndefined();
  });

  it('guards the whole fan-out on the runtime enabled flag and a configured connector', () => {
    // A disabled space or a space with no connector must skip the fan-out entirely (enrichment, the
    // AI agent call, and auto-close all live in the child). The `parallel` step schema has no `if`,
    // so the guard lives on a single enclosing `if` step. The guard is a parens-free `and` because
    // the workflow template parser reads `(` as range syntax.
    const guard = findStepByName(workflow.steps, 'run_alert_analysis') as {
      type: string;
      condition: string;
    };

    expect(guard).toBeDefined();
    expect(guard.type).toBe('if');
    expect(guard.condition).toBe(
      "${{ variables.workflow_enabled and variables.connector_id != '' }}"
    );
  });

  it('fans out over the alert batch with a bounded, settled parallel step', () => {
    const parallelStep = findStepByName(workflow.steps, 'analyze_alerts') as {
      type: string;
      foreach: string;
      concurrency: number;
      mode: string;
    };

    expect(parallelStep).toBeDefined();
    expect(parallelStep.type).toBe('parallel');
    // `settled` lets every child reach a terminal state so one failing alert does not abort the rest.
    expect(parallelStep.mode).toBe('settled');
    // A finite lane count bounds task-manager load; `concurrency: 1` is the sequential kill-switch.
    expect(parallelStep.concurrency).toBe(5);
  });

  it('truncates the fan-out to the configured cap so an oversized batch does not fail the run', () => {
    const parallelStep = findStepByName(workflow.steps, 'analyze_alerts') as { foreach: string };
    // Slicing to consts.max_fan_out keeps the run within DEFAULT_PARALLEL_MAX_FAN_OUT (100) rather
    // than hard-failing the whole batch when a rule raises max_signals above the cap.
    expect(parallelStep.foreach).toBe('{{ event.alerts | slice: 0, consts.max_fan_out | json }}');
    expect(workflow.consts.max_fan_out).toBe(100);
  });

  it('invokes the per-alert child workflow once per alert via workflow.execute', () => {
    const childStep = findStepByName(workflow.steps, 'analyze_single_alert') as {
      type: string;
      with: { 'workflow-id': string; inputs: Record<string, string> };
    };

    expect(childStep).toBeDefined();
    expect(childStep.type).toBe('workflow.execute');
    expect(childStep.with['workflow-id']).toBe(SECURITY_ALERT_ANALYSIS_SINGLE_WORKFLOW_ID);
    // `${{ }}` preserves the alert object; a plain `{{ }}` would stringify it and break the child's
    // per-alert field access.
    expect(childStep.with.inputs.alert).toBe('${{ foreach.item }}');
    expect(childStep.with.inputs.rule_id).toBe('{{ event.rule.id }}');
  });

  it('forwards every per-space runtime setting the child needs', () => {
    const childStep = findStepByName(workflow.steps, 'analyze_single_alert') as {
      with: { inputs: Record<string, string> };
    };
    const { inputs } = childStep.with;

    expect(inputs.connector_id).toBe('{{ variables.connector_id }}');
    expect(inputs.agent_id).toBe('{{ variables.agent_id }}');
    expect(inputs.tag_prefix).toBe('{{ variables.tag_prefix }}');
    expect(inputs.create_conversation).toBe('${{ variables.create_conversation }}');
    expect(inputs.auto_close_enabled).toBe('${{ variables.auto_close_enabled }}');
    expect(inputs.auto_close_confidence_score_min_threshold).toBe(
      '${{ variables.auto_close_confidence_score_min_threshold }}'
    );
    expect(inputs.auto_close_confidence_score_max_threshold).toBe(
      '${{ variables.auto_close_confidence_score_max_threshold }}'
    );
  });

  it('surfaces aggregate fan-out outcomes so settled failures are not hidden from operators', () => {
    const logStep = findStepByName(workflow.steps, 'log_fan_out_results') as {
      with: { message: string };
    };

    expect(logStep).toBeDefined();
    expect(logStep.with.message).toContain('steps.analyze_alerts.output.succeeded');
    expect(logStep.with.message).toContain('steps.analyze_alerts.output.failed');
  });

  it('compiles to an execution graph (the fan-out branch body is a valid straight-line body)', () => {
    // Schema validation does not build the execution graph; a workflow.execute branch body that
    // accidentally carried flow-control or a step-level on-failure/timeout would only fail here.
    expect(() =>
      WorkflowGraph.fromWorkflowDefinition(
        parse(SECURITY_ALERT_ANALYSIS_WORKFLOW.yaml) as WorkflowYaml
      )
    ).not.toThrow();
  });
});
