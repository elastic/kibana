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

describe('AlertZero investigation summary workflow', () => {
  const definition = parse(ALERTZERO_INVESTIGATION_SUMMARY_WORKFLOW.yaml) as {
    enabled: boolean;
    triggers: Array<{ type: string; on: { condition: string } }>;
    settings: { concurrency: { strategy: string; max: number; 'queue-size': number } };
    steps: Array<{ type: string }>;
  };

  it('ships disabled and only matches journal notes, comments, and new attachments', () => {
    expect(ALERTZERO_INVESTIGATION_SUMMARY_WORKFLOW.billable).toBe(false);
    expect(definition.enabled).toBe(false);
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
      strategy: 'queue',
      max: 1,
      'queue-size': 1,
    });
    expect(definition.steps.map((step) => step.type)).toEqual([
      'alertzero.investigation.summarize',
    ]);
  });
});
