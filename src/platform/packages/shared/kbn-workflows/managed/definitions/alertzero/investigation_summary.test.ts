/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { ALERTZERO_INVESTIGATION_SUMMARY_WORKFLOW } from './investigation_summary';
import { createWorkflowLiquidEngine } from '../../../common/utils';

describe('AlertZero investigation summary workflow', () => {
  const definition = parse(ALERTZERO_INVESTIGATION_SUMMARY_WORKFLOW.yaml) as {
    enabled: boolean;
    triggers: Array<{ type: string; on: { condition: string } }>;
    settings: { concurrency: { key: string; strategy: string; max: number } };
    steps: Array<{
      type: string;
      if?: string;
      'on-failure'?: Record<string, unknown>;
      with?: Record<string, unknown>;
    }>;
  };

  it('ships enabled and only matches journal notes, comments, and new attachments', () => {
    expect(ALERTZERO_INVESTIGATION_SUMMARY_WORKFLOW.billable).toBe(false);
    expect(definition.enabled).toBe(true);
    expect(definition.triggers[0].type).toBe('ai.conversation.updated');
    const condition = definition.triggers[0].on.condition;
    expect(condition).toContain('event.templateId: "investigation"');
    expect(condition).toContain('event.templateId: "escalation"');
    expect(condition).toContain('event.eventTypes: "user_message"');
    expect(condition).toContain('event.eventTypes: "text_note"');
    expect(condition).toContain('event.eventTypes: "attachment_added"');
    expect(condition).not.toContain('execution_terminated');
    expect(definition.settings.concurrency).toEqual({
      key: '{{ workflow.id }}:{{ event.conversationId }}',
      strategy: 'cancel-in-progress',
      max: 1,
    });
  });

  it('waits for the conversation to go quiet before it summarizes', () => {
    expect(definition.steps.map((step) => step.type)).toEqual([
      'wait',
      'alertzero.investigation.summarize',
      'alertzero.forensics.renderSummary',
    ]);
    expect(definition.steps[0].with).toEqual({ duration: '10s' });
  });

  // The card shows the summary, so it renders after it, from the same run.
  it('then re-renders the forensics summary card on investigations', () => {
    const [, summarize, forensicsSummary] = definition.steps;
    const liquid = createWorkflowLiquidEngine();
    const runsOn = (templateId: string) =>
      liquid.evalValueSync(
        String(forensicsSummary.if)
          .replace(/^\$\{\{/, '')
          .replace(/\}\}$/, '')
          .trim(),
        { event: { templateId } }
      );
    expect(runsOn('investigation')).toBe(true);
    expect(runsOn('escalation')).toBe(false);
    expect(forensicsSummary.with).toEqual({ conversation_id: '{{ event.conversationId }}' });
    // A failed summary must not keep the card from refreshing.
    expect(summarize['on-failure']).toEqual({ continue: true });
  });
});
