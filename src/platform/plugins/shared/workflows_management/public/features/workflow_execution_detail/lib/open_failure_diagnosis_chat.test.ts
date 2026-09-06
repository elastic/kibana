/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Subject } from 'rxjs';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { ChatEventType } from '@kbn/agent-builder-common/chat/events';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { DiagnosisContextPackage } from './build_diagnosis_context_package';
import { openFailureDiagnosisChat } from './open_failure_diagnosis_chat';

const contextPackage: DiagnosisContextPackage = {
  error: { type: 'Error', message: 'ECONNREFUSED' },
  stepInput: { method: 'GET' },
  stepYaml: { name: 'triage_overview', type: 'http' },
  workflowId: 'wf-1',
  executionId: 'run-1',
  stepId: 'triage_overview',
};

describe('openFailureDiagnosisChat', () => {
  const chat$ = new Subject();
  const openChat = jest.fn();
  const httpPost = jest.fn().mockResolvedValue({});

  const agentBuilder = {
    openChat,
    events: { chat$ },
  } as unknown as AgentBuilderPluginStart;

  const http = {
    post: httpPost,
  } as unknown as HttpSetup;

  beforeEach(() => {
    openChat.mockReset();
    httpPost.mockClear();
  });

  it('opens a new conversation with attachments and auto-sends the prompt', () => {
    openFailureDiagnosisChat({
      agentBuilder,
      http,
      contextPackage,
      workflowName: 'Flyout Demo — AI + Flow Control',
    });

    expect(openChat).toHaveBeenCalledTimes(1);
    const args = openChat.mock.calls[0][0];
    expect(args.newConversation).toBe(true);
    expect(args.autoSendInitialMessage).toBe(true);
    expect(args.initialMessage).toContain('triage_overview');
    expect(args.initialMessage).not.toContain('ECONNREFUSED');
    expect(args.attachments).toHaveLength(1);
    expect(args.attachments[0].type).toBe('group');
    expect(args.attachments[0].items.length).toBeGreaterThanOrEqual(4);
  });

  it('renames the conversation after conversation id is set', async () => {
    openFailureDiagnosisChat({
      agentBuilder,
      http,
      contextPackage,
      workflowName: 'Flyout Demo — AI + Flow Control',
    });

    chat$.next({
      type: ChatEventType.conversationIdSet,
      data: { conversation_id: 'conv-123' },
    });

    await Promise.resolve();

    expect(httpPost).toHaveBeenCalledWith(
      '/internal/agent_builder/conversations/conv-123/_rename',
      expect.objectContaining({
        body: JSON.stringify({
          title: 'Diagnose: Flyout Demo — AI + Flow Control — triage_overview',
        }),
      })
    );
  });

  it('includes attempt history in prompt and attachments when present', () => {
    openFailureDiagnosisChat({
      agentBuilder,
      http,
      contextPackage: {
        ...contextPackage,
        attemptHistory: [{ attemptNumber: 1, status: 'failed' }],
      },
      workflowName: 'Demo',
    });

    const args = openChat.mock.calls[0][0];
    expect(args.initialMessage).toContain('retry attempt history');
    expect(args.attachments[0].items.some((i: { id?: string }) => i.id?.includes('attempts'))).toBe(
      true
    );
  });
});
