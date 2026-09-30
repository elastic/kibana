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
  it('starts on a mention and continues on human thread replies only', () => {
    expect(workflow.triggers).toEqual([
      { type: 'slack2.app_mention', 'connector-id': '*' },
      {
        type: 'slack2.message',
        'connector-id': '*',
        on: { condition: 'event.threadId:* and not event.botId:* and not event.subtype:*' },
      },
    ]);
    expect(requireStep('find_investigation').with?.body).toMatchObject({
      create: "${{ execution.triggeredBy == 'slack2.app_mention' }}",
    });
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
      condition: '${{ steps.find_investigation.output.investigation_id != null }}',
    });
    expect(requireStep('in_investigation_thread').steps?.map(({ name }) => name)).toEqual([
      'set_investigation_url',
      'post_started',
      'record_status_message',
      'investigate',
      'get_investigation',
      'post_result',
    ]);
  });

  it('announces itself and records the message only when the thread has none yet', () => {
    const postStarted = requireStep('post_started');
    expect(postStarted).toMatchObject({
      type: 'slack2.sendMessage',
      if: '${{ steps.find_investigation.output.slack_message_ts == null }}',
    });
    // A later run must not blank the previous findings for as long as its own run takes.
    expect(postStarted.with).not.toHaveProperty('messageTs');
    expect(requireStep('record_status_message').with?.body).toMatchObject({
      create: false,
      slack_message_ts: '{{ steps.post_started.output.ts }}',
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

  it('edits the status message with the result read back from the investigation', () => {
    expect(requireStep('post_result')).toMatchObject({
      type: 'slack2.sendMessage',
      with: {
        messageTs:
          '${{ steps.post_started.output.ts | default: steps.find_investigation.output.slack_message_ts }}',
      },
    });
    expect(requireStep('post_result').with?.text).toContain(
      "steps.get_investigation.output.status == 'completed'"
    );
  });
});
