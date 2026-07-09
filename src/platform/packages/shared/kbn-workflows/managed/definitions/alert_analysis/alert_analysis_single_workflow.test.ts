/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { SECURITY_ALERT_ANALYSIS_SINGLE_WORKFLOW } from '.';
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

describe('SECURITY_ALERT_ANALYSIS_SINGLE_WORKFLOW yaml (per-alert child)', () => {
  const workflow = parse(SECURITY_ALERT_ANALYSIS_SINGLE_WORKFLOW.yaml) as {
    consts: Record<string, unknown>;
    steps: unknown[];
    triggers: Array<{
      type: string;
      inputs?: { properties?: Record<string, unknown>; required?: string[] };
    }>;
  };

  it('declares a manual trigger so it is only invoked internally via workflow.execute', () => {
    expect(workflow.triggers[0].type).toBe('manual');
  });

  it('requires the full per-alert input contract the parent forwards', () => {
    // A drifted/incomplete input contract must fail loudly at validation rather than mid-run, so the
    // fields the parent's fan-out passes are all declared as required inputs.
    const required = workflow.triggers[0].inputs?.required ?? [];
    expect(required).toEqual(
      expect.arrayContaining(['alert', 'rule_id', 'connector_id', 'agent_id', 'tag_prefix'])
    );
  });

  it('types the forwarded alert as an object so per-alert field access works', () => {
    const alertInput = workflow.triggers[0].inputs?.properties?.alert as { type: string };
    expect(alertInput.type).toBe('object');
  });

  it('skips an already-analyzed alert unless override_previous is set', () => {
    const gate = findStepByName(workflow.steps, 'already_analyzed') as {
      type: string;
      condition: string;
    };
    expect(gate.type).toBe('if');
    expect(gate.condition).toContain('variables.already_analyzed_condition');
    expect(gate.condition).toContain('consts.override_previous == false');
  });

  it('runs enrichment queries against the forwarded rule id (not the workflow event)', () => {
    const closeHistory = findStepByName(workflow.steps, 'get_close_history_search') as {
      with: { query: { bool: { filter: Array<Record<string, unknown>> } } };
    };
    const ruleFilter = closeHistory.with.query.bool.filter.find(
      (f) => (f.term as Record<string, unknown>)?.['kibana.alert.rule.uuid'] !== undefined
    ) as { term: Record<string, string> };
    expect(ruleFilter.term['kibana.alert.rule.uuid']).toBe('{{ inputs.rule_id }}');
  });

  it('passes the runtime connector id and create-conversation flag to the AI agent step', () => {
    const agentStep = findStepByName(workflow.steps, 'runAgent_step') as {
      'connector-id': string;
      'create-conversation': string;
    };

    expect(agentStep['connector-id']).toBe('{{ variables.connector_id }}');
    // `${{ }}` preserves the boolean; a plain `{{ }}` would render the string "false" (truthy).
    expect(agentStep['create-conversation']).toBe('${{ variables.create_conversation }}');
  });

  it('constrains the agent classification confidence to a 0-1 scale', () => {
    const agentStep = findStepByName(workflow.steps, 'runAgent_step') as {
      with: { schema: { properties: { confidence_score: { minimum: number; maximum: number } } } };
    };
    expect(agentStep.with.schema.properties.confidence_score.minimum).toBe(0);
    expect(agentStep.with.schema.properties.confidence_score.maximum).toBe(1);
  });

  it('writes short tag names derived from the configurable prefix', () => {
    const setTagsStep = findStepByName(workflow.steps, 'set_tags') as {
      with: { tags_to_add: string[] };
    };
    expect(setTagsStep.with.tags_to_add).toEqual([
      '{{ variables.tag_prefix }}',
      '{{ variables.tag_prefix }}.version.{{ variables.normalized_version }}',
      '{{ variables.tag_prefix }}.classification.{{ steps.runAgent_step.output.structured_output.classification | downcase }}',
      '{{ variables.tag_prefix }}.confidence.{{ steps.runAgent_step.output.structured_output.confidence_score }}',
    ]);
    expect(workflow.consts.closed_tag_suffix).toBe('closed');
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

  it('gates auto-close on the runtime thresholds using a 0-1 confidence scale', () => {
    const autoCloseStep = findStepByName(workflow.steps, 'check_auto_close_conditions') as {
      condition: string;
    };
    expect(autoCloseStep.condition).toContain('false_positive');
    expect(autoCloseStep.condition).toContain('confidence_score >=');
    expect(autoCloseStep.condition).toContain('confidence_score <=');
    expect(autoCloseStep.condition).toContain(
      'variables.auto_close_confidence_score_min_threshold'
    );
    expect(autoCloseStep.condition).toContain(
      'variables.auto_close_confidence_score_max_threshold'
    );
  });

  it('writes its own error note when the agent returns no classification (settled visibility)', () => {
    // Under the parent `mode: settled`, a failing child must still surface an error on the alert
    // timeline; the no-data path writes that note inside the child.
    const noDataNote = findStepByName(workflow.steps, 'add_no_data_note_to_alert') as {
      type: string;
      with: { body: { note: { note: string } } };
    };
    expect(noDataNote.type).toBe('kibana.request');
    expect(noDataNote.with.body.note.note).toContain('Error: No classification returned.');
  });

  it('compiles to an execution graph', () => {
    expect(() =>
      WorkflowGraph.fromWorkflowDefinition(
        parse(SECURITY_ALERT_ANALYSIS_SINGLE_WORKFLOW.yaml) as WorkflowYaml
      )
    ).not.toThrow();
  });
});
