/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'yaml';
import { NIGHTSHIFT_SLACK_THREAD_WORKFLOW } from '.';
import { NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID } from '../investigation';

interface WorkflowStep {
  name: string;
  type: string;
  if?: string;
  condition?: string;
  with?: Record<string, unknown>;
  steps?: WorkflowStep[];
}

const workflow = parse(NIGHTSHIFT_SLACK_THREAD_WORKFLOW.yaml) as {
  settings: { concurrency: { key: string; strategy: string } };
  triggers: Array<{ type: string; 'connector-id': string; on?: { condition: string } }>;
  steps: WorkflowStep[];
};

const flatten = (steps: WorkflowStep[]): WorkflowStep[] =>
  steps.flatMap((step) => [step, ...flatten(step.steps ?? [])]);

const requireStep = (name: string): WorkflowStep => {
  const step = flatten(workflow.steps).find((candidate) => candidate.name === name);
  if (!step) throw new Error(`Expected workflow step ${name}`);
  return step;
};

describe('Nightshift Slack thread workflow', () => {
  it('continues an existing investigation on human thread replies with text only', () => {
    expect(workflow.triggers).toEqual([
      {
        type: 'slack2.message',
        'connector-id': 'elastic-apps-slack',
        on: {
          condition:
            'event.threadId:* and event.text:* and not event.botId:* and (not event.subtype:* or event.subtype:thread_broadcast or event.subtype:file_share)',
        },
      },
    ]);
    expect(requireStep('find_investigation').with?.body).toMatchObject({
      workspace: '${{ event.workspace }}',
      create: false,
    });
  });

  it('records each delivered event and skips one the thread already handled', () => {
    expect(requireStep('find_investigation').with?.body).toMatchObject({
      event_id: '${{ event.correlationKey }}',
    });
    expect(requireStep('in_investigation_thread').condition).toContain(
      'steps.find_investigation.output.duplicate != true'
    );
    for (const name of ['record_status_message', 'record_result_message']) {
      expect(requireStep(name).with?.body).not.toHaveProperty('event_id');
    }
  });

  it('runs replies in the same thread one at a time, in order', () => {
    expect(workflow.settings.concurrency.strategy).toBe('queue');
    expect(workflow.settings.concurrency.key).toContain(
      '{{ event.threadId | default: event.messageId }}'
    );
  });

  it('acts only on a thread that has an investigation', () => {
    expect(requireStep('in_investigation_thread')).toMatchObject({
      type: 'if',
      condition:
        '${{ steps.find_investigation.output.investigation_id != null and steps.find_investigation.output.duplicate != true }}',
    });
    expect(requireStep('in_investigation_thread').steps?.map(({ name }) => name)).toEqual([
      'set_investigation_url',
      'post_started',
      'record_status_message',
      'investigate',
      'get_investigation',
      'set_result',
      'update_result',
      'post_result',
      'set_result_message',
      'record_result_message',
    ]);
  });

  it('announces itself and records the message only when the thread has none yet', () => {
    const postStarted = requireStep('post_started');
    expect(postStarted).toMatchObject({
      type: 'slack2.sendMessage',
      if: '${{ steps.find_investigation.output.status_message_ts == null }}',
    });
    // A later run must not blank the previous findings for as long as its own run takes.
    expect(postStarted.with).not.toHaveProperty('messageTs');
    expect(requireStep('record_status_message')).toMatchObject({
      with: { body: { create: false, status_message_ts: '{{ steps.post_started.output.ts }}' } },
      'on-failure': { retry: { 'max-attempts': 3 }, continue: true },
    });
  });

  it('runs the Slack-agnostic investigation on the found investigation', () => {
    const investigate = requireStep('investigate');
    expect(investigate).toMatchObject({
      type: 'workflow.execute',
      with: {
        'workflow-id': NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID,
        inputs: {
          investigation_id: '{{ steps.find_investigation.output.investigation_id }}',
        },
      },
    });
    expect(investigate.with?.inputs).not.toHaveProperty('slack');
    expect(investigate.with?.inputs).not.toHaveProperty('conversation_id');
  });

  it("reports this run's result, not a previous run's record", () => {
    const setResult = requireStep('set_result').with;
    expect(setResult?.status_message_ts).toBe(
      '${{ steps.post_started.output.ts | default: steps.find_investigation.output.status_message_ts }}'
    );
    expect(setResult?.result_text).toContain('{% if steps.investigate.error == null %}');
    expect(setResult?.result_text).not.toContain('get_investigation.output.status');
    expect(setResult?.result_text).toContain('steps.get_investigation.output.title');
    expect(setResult?.result_text).toContain('steps.get_investigation.output.metadata.summary');
  });

  it('reads the investigation from the shared investigations API', () => {
    expect(requireStep('get_investigation')).toMatchObject({
      type: 'kibana.request',
      with: {
        method: 'GET',
        path: '/s/{{ workflow.spaceId }}/internal/investigations/investigations/{{ steps.find_investigation.output.investigation_id }}',
        headers: { 'elastic-api-version': '1' },
      },
    });
  });

  it('edits the status message with the result, and posts a new one when it cannot', () => {
    expect(requireStep('update_result')).toMatchObject({
      type: 'slack2.updateMessage',
      if: '${{ variables.status_message_ts != null }}',
      with: { messageTs: '{{ variables.status_message_ts }}', text: '{{ variables.result_text }}' },
      // A transient failure must not leave the thread a second status message.
      'on-failure': { retry: { 'max-attempts': 3 }, continue: true },
    });
    const postResult = requireStep('post_result');
    expect(postResult).toMatchObject({
      type: 'slack2.sendMessage',
      if: '${{ steps.update_result.output.ts == null }}',
      with: { text: '{{ variables.result_text }}' },
    });
    expect(postResult.with).not.toHaveProperty('messageTs');
  });

  it('records the message holding the result when it is new or was not recorded', () => {
    expect(requireStep('set_result_message').with?.result_message_ts).toBe(
      '${{ steps.post_result.output.ts | default: steps.update_result.output.ts }}'
    );
    expect(requireStep('record_result_message')).toMatchObject({
      if: '${{ variables.result_message_ts != null and (variables.result_message_ts != variables.status_message_ts or steps.record_status_message.error != null) }}',
      with: { body: { create: false, status_message_ts: '{{ variables.result_message_ts }}' } },
    });
  });
});
