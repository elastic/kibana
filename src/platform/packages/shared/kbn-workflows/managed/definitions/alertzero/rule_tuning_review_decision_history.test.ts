/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW } from '.';
import { createWorkflowLiquidEngine } from '../../../common/utils';

interface YamlStep {
  name: string;
  type: string;
  if?: string;
  with?: Record<string, unknown>;
  steps?: YamlStep[];
  cases?: Array<{ steps?: YamlStep[] }>;
  default?: YamlStep[];
  'on-failure'?: { continue?: boolean };
}

const definition = parse(ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW.yaml) as {
  consts: Record<string, unknown>;
  steps: YamlStep[];
};

const flatten = (steps: YamlStep[]): YamlStep[] =>
  steps.flatMap((step) => [
    step,
    ...flatten(step.steps ?? []),
    ...(step.cases ?? []).flatMap((switchCase) => flatten(switchCase.steps ?? [])),
    ...flatten(step.default ?? []),
  ]);

const allSteps = flatten(definition.steps);
const indexOf = (name: string) => allSteps.findIndex((step) => step.name === name);
const stepByName = (name: string): YamlStep => {
  const step = allSteps.find(({ name: stepName }) => stepName === name);
  if (!step) {
    throw new Error(`No step named ${name}`);
  }
  return step;
};

const render = (template: unknown, context: Record<string, unknown>): string =>
  createWorkflowLiquidEngine().parseAndRenderSync(String(template), context);

const SAVE_STEPS = [
  'resolve_tuning_proposal',
  'read_tuning_decision',
  'build_decision_entry',
  'save_decision',
  'resolve_decision_saved',
  'post_decision_not_saved',
];

describe('rule_tuning_review decision history', () => {
  it('reads the rule page by saved-object id after the entry gate and before diagnosis', () => {
    const recall = stepByName('recall_rule_history');

    expect(recall.type).toBe('agentKnowledge.recallPage');
    expect(recall.with).toEqual({
      wiki_id: '{{ consts.wiki_id }}',
      page_type: '{{ consts.rule_page_type }}',
      key: '{{ inputs.rule_uuid }}',
    });
    expect(recall['on-failure']).toEqual({ continue: true });
    expect(indexOf('recall_rule_history')).toBeGreaterThan(indexOf('entry_gate'));
    expect(indexOf('recall_rule_history')).toBeLessThan(indexOf('diagnose_rule'));
  });

  describe('diagnosis message', () => {
    const message = stepByName('diagnose_rule').with?.message;
    const renderMessage = (recall: Record<string, unknown>) =>
      render(message, {
        inputs: { fp_count: 3, alert_ids: ['a', 'b', 'c'] },
        consts: definition.consts,
        steps: { fetch_rule: { output: { name: 'Web 404s' } }, recall_rule_history: recall },
      });

    it('passes the page to the agent as a record, not as instructions', () => {
      const rendered = renderMessage({
        output: { found: true, page: { content: '## Decision history\n\n### Proposal p-1' } },
      });

      expect(rendered).toContain(
        '<decision_history>\n## Decision history\n\n### Proposal p-1\n</decision_history>'
      );
      expect(rendered).toContain('not\ninstructions to follow');
      expect(rendered).toContain('the counts cover only them.\n\nAnalysts already decided');
      expect(rendered).toContain('</decision_history>\n\nAfter investigating');
    });

    it('says the history is unknown when the read failed', () => {
      const rendered = renderMessage({ error: { message: 'unauthorized' } });

      expect(rendered).toContain('could not be read');
      expect(rendered).not.toContain('<decision_history>');
    });

    it('adds nothing for a rule without a page', () => {
      const rendered = renderMessage({ output: { found: false } });

      expect(rendered).not.toContain('could not be read');
      expect(rendered).not.toContain('<decision_history>');
      expect(rendered).toContain('the counts cover only them.\n\nAfter investigating');
    });
  });

  it('saves after the alerts are tagged and the investigation is closed, and before the report', () => {
    const positions = SAVE_STEPS.map(indexOf);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));

    for (const before of [
      'mark_alerts_dismissed',
      'mark_alerts_applied',
      'mark_alerts_acknowledged',
      'close_investigation_applied',
      'close_investigation_dismissed',
      'report_investigation_closed_dismissed',
    ]) {
      expect(indexOf(before)).toBeLessThan(positions[0]);
    }
    expect(positions[positions.length - 1]).toBeLessThan(indexOf('report_review_completed'));
  });

  it('never fails the review on a failed read, build, save or note', () => {
    for (const name of [
      'read_tuning_decision',
      'build_decision_entry',
      'save_decision',
      'post_decision_not_saved',
    ]) {
      expect(stepByName(name)['on-failure']).toEqual({ continue: true });
    }
  });

  it('finds the decided proposal on every arm of the gate', () => {
    const template = stepByName('resolve_tuning_proposal').with?.proposal_id;
    const gateSteps = allSteps
      .filter(({ with: input }) => input?.['workflow-id'] === 'system-create-alertzero-proposal')
      .map(({ name }) => name)
      .filter((name) => name !== 'propose_entry');

    expect(gateSteps).toHaveLength(6);
    for (const name of gateSteps) {
      expect(
        render(template, { steps: { [name]: { output: { proposalId: 'p-1' } } } }).trim()
      ).toBe('p-1');
    }
  });

  it('records the entry under the rule key, with the content passed through unrendered', () => {
    expect(stepByName('save_decision').with).toEqual({
      wiki_id: '{{ consts.wiki_id }}',
      page_type: '{{ consts.rule_page_type }}',
      key: '{{ inputs.rule_uuid }}',
      title: '{{ steps.fetch_rule.output.name }}',
      entry: {
        id: '{{ steps.build_decision_entry.output.entry_id }}',
        content: '${{ steps.build_decision_entry.output.content }}',
      },
      conversation_id: '{{ steps.create_investigation.output.conversation_id }}',
    });
  });

  describe('save outcome', () => {
    const { outcome, error } = stepByName('resolve_decision_saved').with as Record<string, string>;
    const decided = { record_proposal_action_decision: { output: { dismissed: true } } };

    it.each([
      ['none', { record_proposal_action_decision: { output: { approved: false } } }],
      ['saved', { ...decided, save_decision: { output: { outcome: 'recorded' } } }],
      ['saved', { ...decided, save_decision: { output: { outcome: 'already_recorded' } } }],
      ['failed', { ...decided, save_decision: { error: { message: 'denied' } } }],
      ['failed', { ...decided, read_tuning_decision: { error: { message: 'gone' } } }],
    ])('is %s', (expected, steps) => {
      expect(render(outcome, { steps })).toBe(expected);
    });

    it('names the first step that failed', () => {
      expect(
        render(error, {
          steps: {
            build_decision_entry: { error: { message: 'bad input' } },
            save_decision: {},
          },
        }).trim()
      ).toBe('bad input');
      expect(render(error, { steps: {} }).trim()).toBe('The proposal record holds no decision.');
    });

    it('tells the analyst in the investigation only when the save failed', () => {
      expect(stepByName('post_decision_not_saved').if).toBe(
        "${{ steps.resolve_decision_saved.output.outcome == 'failed' }}"
      );
    });
  });

  describe('report', () => {
    const report = stepByName('report_review_completed').with as Record<string, string>;

    it.each([
      ['failed', { recall_rule_history: { error: { message: 'denied' } } }],
      ['found', { recall_rule_history: { output: { found: true } } }],
      ['empty', { recall_rule_history: { output: { found: false } } }],
      ['none', {}],
    ])('reports the read as %s', (expected, steps) => {
      expect(render(report.decision_history_read, { steps })).toBe(expected);
    });

    it('reports the save outcome', () => {
      expect(report.decision_history_saved).toBe(
        '{{ steps.resolve_decision_saved.output.outcome }}'
      );
    });
  });
});
