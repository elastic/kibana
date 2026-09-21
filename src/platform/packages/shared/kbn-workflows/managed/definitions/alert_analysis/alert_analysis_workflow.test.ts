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
import { createWorkflowLiquidEngine } from '../../../common/utils';

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

// Look the agent step up by type rather than name so these assertions survive the
// onechat_runAgent_step -> runAgent_step rename that lands in a separate PR.
const findStepByType = (steps: unknown[], type: string): Record<string, unknown> | undefined => {
  for (const step of steps) {
    const s = step as Record<string, unknown>;
    if (s.type === type) return s;
    for (const key of ['steps', 'else']) {
      const nested = s[key];
      if (Array.isArray(nested)) {
        const found = findStepByType(nested, type);
        if (found) return found;
      }
    }
  }
  return undefined;
};

const collectStepsByType = (steps: unknown[], type: string): Array<Record<string, unknown>> => {
  const matches: Array<Record<string, unknown>> = [];
  for (const step of steps) {
    const s = step as Record<string, unknown>;
    if (s.type === type) matches.push(s);
    for (const key of ['steps', 'else']) {
      const nested = s[key];
      if (Array.isArray(nested)) {
        matches.push(...collectStepsByType(nested, type));
      }
    }
  }
  return matches;
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

  it('space-scopes the path of every kibana.request step', () => {
    // Only generated `kibana.*` connector steps get a space prefix from the engine; a raw
    // `kibana.request` is sent verbatim, so an unprefixed path writes to the default space and
    // still returns 200. Asserting over every request step, rather than the ones that exist
    // today, keeps steps added later covered too.
    const requestSteps = collectStepsByType(workflow.steps, 'kibana.request') as Array<{
      name: string;
      with: { path: string };
    }>;
    const unscoped = requestSteps.filter(
      ({ with: { path } }) => !path.startsWith('/s/{{ workflow.spaceId }}/')
    );

    expect(requestSteps.length).toBeGreaterThan(0);
    expect(unscoped.map(({ name, with: { path } }) => `${name}: ${path}`)).toEqual([]);
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

  it('writes short tag names derived from the configurable prefix', () => {
    const setTagsStep = findStepByName(workflow.steps, 'set_tags') as {
      with: { tags_to_add: string[] };
    };
    expect(setTagsStep).toBeDefined();
    // The short tag names: `.classification.` and `.confidence.`, not the old longer
    // `.output.classification.` / `.output.confidence_score.` segments. (The trailing
    // `steps.runAgent_step.output.structured_output.*` is the agent step's output value that
    // fills the tag, not part of the tag name.)
    expect(setTagsStep.with.tags_to_add).toEqual([
      '{{ variables.tag_prefix }}',
      '{{ variables.tag_prefix }}.version.{{ variables.normalized_version }}',
      '{{ variables.tag_prefix }}.classification.{{ steps.runAgent_step.output.structured_output.classification | downcase }}',
      '{{ variables.tag_prefix }}.confidence.{{ steps.runAgent_step.output.structured_output.confidence_score }}',
    ]);
    // The auto-close suffix is short too.
    expect(workflow.consts.closed_tag_suffix).toBe('closed');
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
    const agentStep = findStepByName(workflow.steps, 'runAgent_step') as {
      'connector-id': string;
      'create-conversation': string;
    };

    expect(agentStep).toBeDefined();
    expect(agentStep['connector-id']).toBe('{{ variables.connector_id }}');
    // `${{ }}` preserves the boolean; a plain `{{ }}` would render the string "false" (truthy).
    expect(agentStep['create-conversation']).toBe('${{ variables.create_conversation }}');
  });

  it('trims the alert with the pick filter over the configured allow-list before the agent step', () => {
    const minimalAlertStep = findStepByName(workflow.steps, 'build_minimal_alert') as {
      type: string;
      with: { minimal_alert: string };
    };

    expect(minimalAlertStep).toBeDefined();
    expect(minimalAlertStep.type).toBe('data.set');
    // Delegates the field selection to the `pick` filter + the shared const list, rather than
    // hand-reshaping ~60 nested fields inline.
    expect(minimalAlertStep.with.minimal_alert).toBe(
      '${{ foreach.item | pick: consts.model_alert_fields }}'
    );
  });

  it('lists the high-signal allow-list fields in consts.model_alert_fields', () => {
    const fields = workflow.consts.model_alert_fields as string[];

    expect(fields).toEqual(
      expect.arrayContaining(['_id', '_index', 'process.command_line', 'kibana.alert.rule.name'])
    );
  });

  it('sends the trimmed alert (not the full foreach item) to the agent attachment', () => {
    const agentStep = findStepByType(workflow.steps, 'ai.agent') as {
      with: { attachments: Array<{ type: string; data: { alert: string } }> };
    };

    expect(agentStep.with.attachments[0].data.alert).toBe('{{ variables.minimal_alert | json:2 }}');
  });

  it('adds token usage metadata to the verdict note', () => {
    const verdictNoteStep = findStepByName(workflow.steps, 'add_verdict_note_to_alert') as {
      with: { body: { note: { note: string } } };
    };
    const note = verdictNoteStep.with.body.note.note;

    expect(note).toContain('steps.runAgent_step.output.metadata.usage.inputTokens');
    expect(note).toContain('steps.runAgent_step.output.metadata.usage.outputTokens');
    expect(note).toContain('steps.runAgent_step.output.metadata.usage.totalTokens');
  });

  it('formats the verdict note timestamp with a human-readable date filter', () => {
    const verdictNoteStep = findStepByName(workflow.steps, 'add_verdict_note_to_alert') as {
      with: { body: { note: { note: string } } };
    };

    expect(verdictNoteStep.with.body.note.note).toContain(
      "{{ execution.startedAt | date: '%B %d, %Y at %H:%M:%S UTC' }}"
    );
  });

  it('guards build_techniques_for_tactic foreach against tactic-only threat entries with no technique array', () => {
    // Rules whose threat mapping has a tactic entry but no technique array (valid per schema)
    // caused the workflow to crash with "Foreach expression resolved to undefined" because
    // `nil | json` returns undefined in the expression evaluator. The foreach must use
    // `| default: "[]" | json_parse` so it safely yields an empty iteration for tactic-only entries.
    const techniquesForeachStep = findStepByName(workflow.steps, 'build_techniques_for_tactic') as {
      foreach: string;
    };
    expect(techniquesForeachStep).toBeDefined();

    const expression = techniquesForeachStep.foreach;
    // The expression is a `{{ }}` template; strip the delimiters to get the inner liquid expression
    // that the workflow engine evaluates via evalValueSync.
    expect(expression.startsWith('{{') && expression.endsWith('}}')).toBe(true);
    const innerExpr = expression.slice(2, -2).trim();

    const engine = createWorkflowLiquidEngine();

    // Tactic-only entry (no technique key): must resolve to [] so the foreach iterates zero times
    // rather than throwing "Foreach expression must evaluate to an array".
    const tacticOnly = engine.evalValueSync(innerExpr, {
      foreach: { item: { framework: 'MITRE ATT&CK', tactic: { id: 'TA0007', name: 'Discovery' } } },
    });
    expect(tacticOnly).toEqual([]);

    // Entry with a technique array: must pass the array through unchanged.
    const techniques = [{ id: 'T1057', name: 'Process Discovery' }];
    const withTechniques = engine.evalValueSync(innerExpr, {
      foreach: {
        item: {
          framework: 'MITRE ATT&CK',
          tactic: { id: 'TA0007', name: 'Discovery' },
          technique: techniques,
        },
      },
    });
    expect(withTechniques).toEqual(techniques);
  });

  it('guards build_threat_technique_lines foreach against rules with no threat mapping', () => {
    // Rules that have no threat mapping at all (threats field is nil) crashed the workflow with
    // "Foreach expression resolved to undefined" because `nil | json` returns undefined.
    // The foreach must use `| default: "[]" | json_parse` so it safely yields zero iterations.
    const outerForeachStep = findStepByName(workflow.steps, 'build_threat_technique_lines') as {
      foreach: string;
    };
    expect(outerForeachStep).toBeDefined();

    const expression = outerForeachStep.foreach;
    expect(expression.startsWith('{{') && expression.endsWith('}}')).toBe(true);
    const innerExpr = expression.slice(2, -2).trim();

    const engine = createWorkflowLiquidEngine();

    // No threat mapping at all (threats is nil): must resolve to [] instead of crashing.
    const noThreats = engine.evalValueSync(innerExpr, {
      steps: { get_rule_metadata: { output: { metadata: { threats: null } } } },
    });
    expect(noThreats).toEqual([]);

    // Rule with a threat array: must pass it through unchanged.
    const threats = [{ tactic: { id: 'TA0007', name: 'Discovery' }, technique: [] }];
    const withThreats = engine.evalValueSync(innerExpr, {
      steps: { get_rule_metadata: { output: { metadata: { threats } } } },
    });
    expect(withThreats).toEqual(threats);
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

    const agentStep = findStepByName(workflow.steps, 'runAgent_step') as {
      with: { schema: { properties: { confidence_score: { minimum: number; maximum: number } } } };
    };
    // The LLM schema maximum must stay on the same 0-1 scale as the thresholds, or `score <= 1.0`
    // would never hold for a meaningful score.
    expect(agentStep.with.schema.properties.confidence_score.minimum).toBe(0);
    expect(agentStep.with.schema.properties.confidence_score.maximum).toBe(1);
  });
});
