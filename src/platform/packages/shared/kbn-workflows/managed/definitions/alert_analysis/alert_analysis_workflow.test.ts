/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { SECURITY_ALERT_ANALYSIS_WORKFLOW } from '.';

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

describe('SECURITY_ALERT_ANALYSIS_WORKFLOW yaml', () => {
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

  it('does not bake connector/auto-close/create-conversation config into consts', () => {
    // These are per-space and read at run time; leaving stale literals here (e.g. a dev connector
    // id) would be misleading and unused.
    expect(workflow.consts.connector_id).toBeUndefined();
    expect(workflow.consts.auto_close_enabled).toBeUndefined();
    expect(workflow.consts.auto_close_confidence_score_min_threshold).toBeUndefined();
    expect(workflow.consts.auto_close_confidence_score_max_threshold).toBeUndefined();
    expect(workflow.consts.create_conversation).toBeUndefined();
  });

  it('guards the whole alert loop on the runtime enabled flag and a configured connector', () => {
    const loop = findStepByName(workflow.steps, 'loop_over_results') as { if: string };

    expect(loop).toBeDefined();
    // A disabled space or a space with no connector must skip enrichment, the AI agent call, and
    // auto-close (fixes enabled-with-no-connector and moves the on/off decision to run time). The
    // guard is a parens-free `and` because the workflow template parser reads `(` as range syntax.
    expect(loop.if).toBe("${{ variables.workflow_enabled and variables.connector_id != '' }}");
  });

  it('passes the runtime connector id and create-conversation flag to the AI agent step', () => {
    const agentStep = findStepByName(workflow.steps, 'onechat_runAgent_step') as {
      'connector-id': string;
      'create-conversation': string;
    };

    expect(agentStep).toBeDefined();
    expect(agentStep['connector-id']).toBe('{{ variables.connector_id }}');
    // `${{ }}` preserves the boolean; a plain `{{ }}` would render the string "false" (truthy).
    expect(agentStep['create-conversation']).toBe('${{ variables.create_conversation }}');
  });

  it('gates auto-close on the runtime thresholds using a 0-1 confidence scale', () => {
    const autoCloseStep = findStepByName(workflow.steps, 'check_auto_close_conditions') as {
      condition: string;
    };
    expect(autoCloseStep).toBeDefined();
    expect(autoCloseStep.condition).toContain('false_positive');
    expect(autoCloseStep.condition).toContain('confidence_score >=');
    expect(autoCloseStep.condition).toContain('confidence_score <=');
    expect(autoCloseStep.condition).toContain(
      'variables.auto_close_confidence_score_min_threshold'
    );
    expect(autoCloseStep.condition).toContain(
      'variables.auto_close_confidence_score_max_threshold'
    );

    const agentStep = findStepByName(workflow.steps, 'onechat_runAgent_step') as {
      with: { schema: { properties: { confidence_score: { minimum: number; maximum: number } } } };
    };
    // The LLM schema maximum must stay on the same 0-1 scale as the thresholds, or `score <= 1.0`
    // would never hold for a meaningful score.
    expect(agentStep.with.schema.properties.confidence_score.minimum).toBe(0);
    expect(agentStep.with.schema.properties.confidence_score.maximum).toBe(1);
  });
});
