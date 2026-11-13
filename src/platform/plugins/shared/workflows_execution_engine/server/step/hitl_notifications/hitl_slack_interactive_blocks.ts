/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  encodeHitlSlackCorrelation,
  HITL_SLACK_ACTION_APPROVE,
  HITL_SLACK_ACTION_REJECT,
  HITL_SLACK_ACTION_SUBMIT,
  HITL_SLACK_CORRELATION_VERSION,
  type HitlSlackCorrelation,
} from '@kbn/workflows';

const SLACK_PLAIN_TEXT_MAX = 75;
const SLACK_SECTION_TEXT_MAX = 3000;

export interface HitlSlackInteractiveResumeContext {
  executionId: string;
  stepId: string;
  token: string;
  spaceId: string;
}

function truncatePlainText(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, Math.max(0, max - 1))}…`;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function buildCorrelation(
  resume: HitlSlackInteractiveResumeContext,
  kind: HitlSlackCorrelation['kind']
): string {
  return encodeHitlSlackCorrelation({
    v: HITL_SLACK_CORRELATION_VERSION,
    executionId: resume.executionId,
    stepId: resume.stepId,
    token: resume.token,
    spaceId: resume.spaceId,
    kind,
  });
}

/** Block Kit for interactive waitForApproval (Approve / Decline). */
export function buildHitlSlackApprovalBlocks({
  message,
  approveLabel,
  rejectLabel,
  resume,
}: {
  message: string;
  approveLabel: string;
  rejectLabel: string;
  resume: HitlSlackInteractiveResumeContext;
}): Array<Record<string, unknown>> {
  const blocks: Array<Record<string, unknown>> = [];
  const correlation = buildCorrelation(resume, 'approval');

  if (message.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: truncatePlainText(message, SLACK_SECTION_TEXT_MAX),
      },
    });
  }

  blocks.push({
    type: 'actions',
    block_id: 'hitl_approval_actions',
    elements: [
      {
        type: 'button',
        action_id: HITL_SLACK_ACTION_APPROVE,
        text: {
          type: 'plain_text',
          text: truncatePlainText(approveLabel, SLACK_PLAIN_TEXT_MAX),
          emoji: true,
        },
        style: 'primary',
        value: correlation,
      },
      {
        type: 'button',
        action_id: HITL_SLACK_ACTION_REJECT,
        text: {
          type: 'plain_text',
          text: truncatePlainText(rejectLabel, SLACK_PLAIN_TEXT_MAX),
          emoji: true,
        },
        style: 'danger',
        value: correlation,
      },
    ],
  });

  return blocks;
}

interface JsonSchemaNode {
  type?: string | string[];
  properties?: Record<string, unknown>;
  required?: string[];
  enum?: unknown[];
  items?: { enum?: unknown[] };
  format?: string;
  description?: string;
  title?: string;
  maxLength?: number;
}

function primaryType(node: JsonSchemaNode): string | undefined {
  if (typeof node.type === 'string') {
    return node.type;
  }
  if (Array.isArray(node.type)) {
    return node.type.find((entry): entry is string => entry !== 'null');
  }
  return undefined;
}

function fieldLabel(key: string, node: JsonSchemaNode): string {
  if (typeof node.title === 'string' && node.title.length > 0) {
    return truncatePlainText(node.title, SLACK_PLAIN_TEXT_MAX);
  }
  return truncatePlainText(key, SLACK_PLAIN_TEXT_MAX);
}

function arrayOfStringEnum(node: JsonSchemaNode): string[] | undefined {
  if (primaryType(node) !== 'array') {
    return undefined;
  }
  const choices = node.items?.enum;
  if (
    !Array.isArray(choices) ||
    choices.length === 0 ||
    !choices.every((entry) => typeof entry === 'string')
  ) {
    return undefined;
  }
  return choices;
}

function buildInputElement(key: string, node: JsonSchemaNode): Record<string, unknown> {
  const type = primaryType(node);
  const arrayEnum = arrayOfStringEnum(node);

  if (arrayEnum) {
    return {
      type: 'multi_static_select',
      action_id: key,
      options: arrayEnum.slice(0, 100).map((entry) => ({
        text: { type: 'plain_text', text: truncatePlainText(entry, SLACK_PLAIN_TEXT_MAX) },
        value: entry,
      })),
    };
  }

  if (Array.isArray(node.enum) && node.enum.every((entry) => typeof entry === 'string')) {
    return {
      type: 'static_select',
      action_id: key,
      options: node.enum.slice(0, 100).map((entry) => ({
        text: { type: 'plain_text', text: truncatePlainText(entry, SLACK_PLAIN_TEXT_MAX) },
        value: entry,
      })),
    };
  }

  if (type === 'boolean') {
    return {
      type: 'radio_buttons',
      action_id: key,
      options: [
        {
          text: { type: 'plain_text', text: 'Yes' },
          value: 'true',
        },
        {
          text: { type: 'plain_text', text: 'No' },
          value: 'false',
        },
      ],
    };
  }

  if (type === 'number' || type === 'integer') {
    return {
      type: 'number_input',
      action_id: key,
      is_decimal_allowed: type === 'number',
    };
  }

  if (type === 'string' && node.format === 'email') {
    return {
      type: 'email_text_input',
      action_id: key,
    };
  }

  if (type === 'string' && (node.format === 'uri' || node.format === 'url')) {
    return {
      type: 'url_text_input',
      action_id: key,
    };
  }

  const multiline =
    type === 'object' ||
    type === 'array' ||
    type === undefined ||
    (typeof node.maxLength === 'number' && node.maxLength > 256);

  return {
    type: 'plain_text_input',
    action_id: key,
    multiline,
    ...(typeof node.description === 'string' && node.description.length > 0
      ? {
          placeholder: {
            type: 'plain_text',
            text: truncatePlainText(node.description, SLACK_PLAIN_TEXT_MAX),
          },
        }
      : {}),
  };
}

/**
 * Flattens a waitForInput JSON Schema into Slack input blocks.
 * An array of string enums becomes a multi-select. Other arrays and objects become multiline text boxes.
 */
export function buildHitlSlackInputBlocksFromSchema({
  message,
  schema,
  resume,
}: {
  message: string;
  schema: unknown;
  resume: HitlSlackInteractiveResumeContext;
}): Array<Record<string, unknown>> {
  const blocks: Array<Record<string, unknown>> = [];
  const correlation = buildCorrelation(resume, 'input');

  if (message.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: truncatePlainText(message, SLACK_SECTION_TEXT_MAX),
      },
    });
  }

  const root = asRecord(schema) as JsonSchemaNode | undefined;
  const properties = root?.properties ? asRecord(root.properties) : undefined;
  const required = new Set(
    Array.isArray(root?.required)
      ? root.required.filter((entry): entry is string => typeof entry === 'string')
      : []
  );

  if (properties) {
    for (const [key, rawNode] of Object.entries(properties)) {
      const node = (asRecord(rawNode) ?? {}) as JsonSchemaNode;
      blocks.push({
        type: 'input',
        block_id: `hitl_field_${key}`,
        optional: !required.has(key),
        label: { type: 'plain_text', text: fieldLabel(key, node) },
        element: buildInputElement(key, node),
      });
    }
  }

  blocks.push({
    type: 'actions',
    block_id: 'hitl_input_actions',
    elements: [
      {
        type: 'button',
        action_id: HITL_SLACK_ACTION_SUBMIT,
        text: { type: 'plain_text', text: 'Submit', emoji: true },
        style: 'primary',
        value: correlation,
      },
    ],
  });

  return blocks;
}
