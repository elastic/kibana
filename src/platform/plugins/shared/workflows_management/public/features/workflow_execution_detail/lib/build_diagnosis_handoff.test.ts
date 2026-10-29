/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AttachmentType, type TextAttachmentData } from '@kbn/agent-builder-common/attachments';
import type { DiagnosisContextPackage } from './build_diagnosis_context_package';
import {
  buildDiagnosisAttachments,
  buildDiagnosisConversationTitle,
  buildDiagnosisHandoffOpenChatPayload,
  buildDiagnosisPrompt,
  DIAGNOSIS_ATTACHMENT_MAX_CHARS,
  serializeDiagnosisAttachmentContent,
} from './build_diagnosis_handoff';

const basePackage = (
  overrides: Partial<DiagnosisContextPackage> = {}
): DiagnosisContextPackage => ({
  error: { type: 'Error', message: 'ECONNREFUSED' },
  stepInput: { method: 'GET', path: '/api/status' },
  stepYaml: { name: 'triage_overview', type: 'http' },
  workflowId: 'wf-1',
  executionId: 'run-1',
  stepId: 'triage_overview',
  ...overrides,
});

describe('serializeDiagnosisAttachmentContent', () => {
  it('leaves small values intact and flags truncated=false', () => {
    const result = serializeDiagnosisAttachmentContent({ a: 1 }, 1000);
    expect(result.truncated).toBe(false);
    expect(result.content).toContain('"a": 1');
    expect(result.originalCharCount).toBe(result.contentCharCount);
  });

  it('truncates oversized values with an explicit marker and metadata', () => {
    const large = 'x'.repeat(DIAGNOSIS_ATTACHMENT_MAX_CHARS + 500);
    const result = serializeDiagnosisAttachmentContent(large);
    expect(result.truncated).toBe(true);
    expect(result.originalCharCount).toBe(large.length);
    expect(result.content).toContain(
      `…[truncated, ${DIAGNOSIS_ATTACHMENT_MAX_CHARS} of ${large.length} chars]`
    );
    expect(result.content.length).toBeLessThanOrEqual(DIAGNOSIS_ATTACHMENT_MAX_CHARS);
  });
});

describe('buildDiagnosisPrompt', () => {
  it('includes attempt-history wording when retries are present', () => {
    const prompt = buildDiagnosisPrompt('triage_overview', true);
    expect(prompt).toContain('triage_overview');
    expect(prompt).toContain('retry attempt history');
    expect(prompt).not.toContain('ECONNREFUSED');
  });

  it('omits attempt-history wording for plain failures', () => {
    const prompt = buildDiagnosisPrompt('triage_overview', false);
    expect(prompt).toContain('triage_overview');
    expect(prompt).not.toContain('retry attempt history');
    expect(prompt).not.toContain('ECONNREFUSED');
  });
});

describe('buildDiagnosisConversationTitle', () => {
  it('formats Diagnose: workflow — step', () => {
    expect(
      buildDiagnosisConversationTitle('Flyout Demo — AI + Flow Control', 'triage_overview')
    ).toBe('Diagnose: Flyout Demo — AI + Flow Control — triage_overview');
  });
});

describe('buildDiagnosisAttachments', () => {
  it('includes attempt history attachment only when present on the package', () => {
    const plain = buildDiagnosisAttachments(basePackage());
    expect(plain).toHaveLength(1);
    expect(plain[0].type).toBe('group');
    expect(plain[0].items.some((i) => i.id?.includes('attempts'))).toBe(false);
    expect(plain[0].items.every((i) => i.type === AttachmentType.text)).toBe(true);

    const withAttempts = buildDiagnosisAttachments(
      basePackage({
        attemptHistory: [
          {
            attemptNumber: 1,
            status: 'failed',
            error: { type: 'Error', message: 'first' },
          },
        ],
      })
    );
    expect(withAttempts[0].items.some((i) => i.id?.includes('attempts'))).toBe(true);
  });

  it('flags truncation in description when resolved input is oversized', () => {
    const hugeInput = { body: 'y'.repeat(DIAGNOSIS_ATTACHMENT_MAX_CHARS + 100) };
    const [group] = buildDiagnosisAttachments(basePackage({ stepInput: hugeInput }));
    const inputAttachment = group.items.find((i) => i.id?.includes('input'));
    expect(inputAttachment?.description).toMatch(/truncated/i);
    const attachmentData = inputAttachment?.data as TextAttachmentData | undefined;
    const parsed = JSON.parse(attachmentData?.content ?? '{}');
    expect(parsed.truncated).toBe(true);
  });
});

describe('buildDiagnosisHandoffOpenChatPayload', () => {
  it('builds auto-send prompt + attachments without inlining the error into the prompt', () => {
    const payload = buildDiagnosisHandoffOpenChatPayload({
      contextPackage: basePackage(),
      workflowName: 'Flyout Demo — AI + Flow Control',
    });

    expect(payload.conversationTitle).toBe(
      'Diagnose: Flyout Demo — AI + Flow Control — triage_overview'
    );
    expect(payload.initialMessage).not.toContain('retry attempt history');
    expect(payload.initialMessage).not.toContain('ECONNREFUSED');
    expect(payload.attachments[0].items.some((i) => i.id?.includes('error'))).toBe(true);
    expect(payload.sessionTag).toContain('run-1');
  });

  it('includes attempt history in both attachment and prompt when present', () => {
    const payload = buildDiagnosisHandoffOpenChatPayload({
      contextPackage: basePackage({
        attemptHistory: [{ attemptNumber: 1, status: 'failed' }],
      }),
      workflowName: 'Demo',
    });
    expect(payload.initialMessage).toContain('retry attempt history');
    expect(payload.attachments[0].items.some((i) => i.id?.includes('attempts'))).toBe(true);
  });
});
