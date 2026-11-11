/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import type { AttachmentGroup, AttachmentInput } from '@kbn/agent-builder-common/attachments';
import { i18n } from '@kbn/i18n';
import type { DiagnosisContextPackage } from './build_diagnosis_context_package';

/** Max serialized characters per diagnosis attachment value (never silent). */
export const DIAGNOSIS_ATTACHMENT_MAX_CHARS = 32_000;

export interface TruncatedAttachmentPayload {
  truncated: boolean;
  originalCharCount: number;
  contentCharCount: number;
  content: string;
}

/**
 * Serialize a value and truncate oversized payloads with an explicit marker.
 * Truncation is also flagged on the returned metadata object.
 */
export const serializeDiagnosisAttachmentContent = (
  value: unknown,
  maxChars: number = DIAGNOSIS_ATTACHMENT_MAX_CHARS
): TruncatedAttachmentPayload => {
  const raw =
    typeof value === 'string'
      ? value
      : (() => {
          try {
            return JSON.stringify(value, null, 2);
          } catch {
            return String(value);
          }
        })();

  const originalCharCount = raw.length;
  if (originalCharCount <= maxChars) {
    return {
      truncated: false,
      originalCharCount,
      contentCharCount: originalCharCount,
      content: raw,
    };
  }

  const marker = `…[truncated, ${maxChars} of ${originalCharCount} chars]`;
  const keep = Math.max(0, maxChars - marker.length);
  const content = `${raw.slice(0, keep)}${marker}`;

  return {
    truncated: true,
    originalCharCount,
    contentCharCount: content.length,
    content,
  };
};

const textAttachment = ({
  id,
  description,
  value,
}: {
  id: string;
  description: string;
  value: unknown;
}): AttachmentInput => {
  const payload = serializeDiagnosisAttachmentContent(value);
  const descriptionWithTruncation = payload.truncated
    ? i18n.translate(
        'workflows.executionFlyout.failedStep.diagnoseAttachmentTruncatedDescription',
        {
          defaultMessage: '{description} (truncated, {kept} of {total} chars)',
          values: {
            description,
            kept: DIAGNOSIS_ATTACHMENT_MAX_CHARS,
            total: payload.originalCharCount,
          },
        }
      )
    : description;

  return {
    id,
    type: AttachmentType.text,
    description: descriptionWithTruncation,
    data: {
      // Structured envelope so the agent sees truncation metadata, not only the body.
      content: JSON.stringify(payload),
    },
  };
};

/**
 * Build Agent Builder attachments for a diagnosis handoff.
 * One group chip in the UI; individual text items the agent can read.
 */
export const buildDiagnosisAttachments = (
  contextPackage: DiagnosisContextPackage
): AttachmentGroup[] => {
  const items: AttachmentInput[] = [
    textAttachment({
      id: `wf-diagnose-error-${contextPackage.executionId}`,
      description: i18n.translate('workflows.executionFlyout.failedStep.diagnoseAttachmentError', {
        defaultMessage: 'Step error',
      }),
      value: contextPackage.error,
    }),
    textAttachment({
      id: `wf-diagnose-input-${contextPackage.executionId}`,
      description: i18n.translate(
        'workflows.executionFlyout.failedStep.diagnoseAttachmentStepInput',
        { defaultMessage: 'Resolved step input' }
      ),
      value: contextPackage.stepInput,
    }),
    textAttachment({
      id: `wf-diagnose-yaml-${contextPackage.executionId}`,
      description: i18n.translate(
        'workflows.executionFlyout.failedStep.diagnoseAttachmentStepYaml',
        { defaultMessage: 'Step YAML definition' }
      ),
      value: contextPackage.stepYaml,
    }),
  ];

  if (contextPackage.attemptHistory != null) {
    items.push(
      textAttachment({
        id: `wf-diagnose-attempts-${contextPackage.executionId}`,
        description: i18n.translate(
          'workflows.executionFlyout.failedStep.diagnoseAttachmentAttemptHistory',
          { defaultMessage: 'Retry attempt history' }
        ),
        value: contextPackage.attemptHistory,
      })
    );
  }

  items.push(
    textAttachment({
      id: `wf-diagnose-ids-${contextPackage.executionId}`,
      description: i18n.translate('workflows.executionFlyout.failedStep.diagnoseAttachmentIds', {
        defaultMessage: 'Workflow / execution / step IDs',
      }),
      value: {
        workflowId: contextPackage.workflowId,
        executionId: contextPackage.executionId,
        stepId: contextPackage.stepId,
      },
    })
  );

  return [
    {
      type: 'group',
      id: `wf-diagnose-${contextPackage.executionId}-${contextPackage.stepId}`,
      label: i18n.translate('workflows.executionFlyout.failedStep.diagnoseAttachmentGroupLabel', {
        defaultMessage: 'Workflow step failure context',
      }),
      items,
    },
  ];
};

/**
 * Visible first user message for the diagnosis handoff. Omits the attempt-history
 * clause when that attachment is absent.
 */
export const buildDiagnosisPrompt = (stepName: string, includeAttemptHistory: boolean): string => {
  if (includeAttemptHistory) {
    return i18n.translate('workflows.executionFlyout.failedStep.diagnosePromptWithAttempts', {
      defaultMessage:
        "Diagnose why the workflow step {stepName} failed. Use the attached error, the step's resolved input, its YAML definition, and the retry attempt history. Explain the most likely root cause in plain language, then suggest how to fix it. If the fix involves changing the workflow, show the corrected YAML for this step.",
      values: { stepName },
    });
  }

  return i18n.translate('workflows.executionFlyout.failedStep.diagnosePrompt', {
    defaultMessage:
      "Diagnose why the workflow step {stepName} failed. Use the attached error, the step's resolved input, and its YAML definition. Explain the most likely root cause in plain language, then suggest how to fix it. If the fix involves changing the workflow, show the corrected YAML for this step.",
    values: { stepName },
  });
};

export const buildDiagnosisConversationTitle = (workflowName: string, stepName: string): string =>
  i18n.translate('workflows.executionFlyout.failedStep.diagnoseConversationTitle', {
    defaultMessage: 'Diagnose: {workflowName} — {stepName}',
    values: { workflowName, stepName },
  });

export interface DiagnosisHandoffOpenChatArgs {
  contextPackage: DiagnosisContextPackage;
  workflowName: string;
}

export interface DiagnosisHandoffOpenChatPayload {
  conversationTitle: string;
  initialMessage: string;
  sessionTag: string;
  attachments: AttachmentGroup[];
}

export const buildDiagnosisHandoffOpenChatPayload = ({
  contextPackage,
  workflowName,
}: DiagnosisHandoffOpenChatArgs): DiagnosisHandoffOpenChatPayload => {
  const stepName = contextPackage.stepId;
  const includeAttemptHistory = contextPackage.attemptHistory != null;

  return {
    conversationTitle: buildDiagnosisConversationTitle(workflowName, stepName),
    initialMessage: buildDiagnosisPrompt(stepName, includeAttemptHistory),
    sessionTag: `workflow-execution-diagnose:${contextPackage.executionId}:${contextPackage.stepId}`,
    attachments: buildDiagnosisAttachments(contextPackage),
  };
};
