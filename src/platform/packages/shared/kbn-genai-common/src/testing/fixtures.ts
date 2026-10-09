/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ATTRIBUTE_GEN_AI_COMPLETION,
  ATTRIBUTE_GEN_AI_INPUT_MESSAGES,
  ATTRIBUTE_GEN_AI_OUTPUT_MESSAGES,
  ATTRIBUTE_GEN_AI_PROMPT,
  GEN_AI_MESSAGE_ROLES,
} from '../genai/constants';
import type { GenAiMessage } from '../genai/types';

const ATTRIBUTES_PREFIX = 'attributes.';
const toSourceKey = (field: string) => field.slice(ATTRIBUTES_PREFIX.length);

const TEST_MESSAGE_CONTENT = 'hello';

export interface GenAiFieldFixture {
  source: Record<string, unknown>;
  expectedMessages: GenAiMessage[];
}

export const GEN_AI_INPUT_FIELD_FIXTURES: Record<string, GenAiFieldFixture> = {
  [ATTRIBUTE_GEN_AI_INPUT_MESSAGES]: {
    source: {
      attributes: {
        [toSourceKey(ATTRIBUTE_GEN_AI_INPUT_MESSAGES)]: [
          JSON.stringify({ role: GEN_AI_MESSAGE_ROLES.USER, content: TEST_MESSAGE_CONTENT }),
        ],
      },
    },
    expectedMessages: [{ role: GEN_AI_MESSAGE_ROLES.USER, content: TEST_MESSAGE_CONTENT }],
  },
  [ATTRIBUTE_GEN_AI_PROMPT]: {
    source: {
      attributes: {
        [toSourceKey(ATTRIBUTE_GEN_AI_PROMPT)]: JSON.stringify({
          messages: [{ role: GEN_AI_MESSAGE_ROLES.USER, content: TEST_MESSAGE_CONTENT }],
        }),
      },
    },
    expectedMessages: [{ role: GEN_AI_MESSAGE_ROLES.USER, content: TEST_MESSAGE_CONTENT }],
  },
};

export const GEN_AI_OUTPUT_FIELD_FIXTURES: Record<string, GenAiFieldFixture> = {
  [ATTRIBUTE_GEN_AI_OUTPUT_MESSAGES]: {
    source: {
      attributes: {
        [toSourceKey(ATTRIBUTE_GEN_AI_OUTPUT_MESSAGES)]: [
          JSON.stringify({ role: GEN_AI_MESSAGE_ROLES.ASSISTANT, content: TEST_MESSAGE_CONTENT }),
        ],
      },
    },
    expectedMessages: [{ role: GEN_AI_MESSAGE_ROLES.ASSISTANT, content: TEST_MESSAGE_CONTENT }],
  },
  [ATTRIBUTE_GEN_AI_COMPLETION]: {
    source: {
      attributes: {
        [toSourceKey(ATTRIBUTE_GEN_AI_COMPLETION)]: JSON.stringify({
          completion: TEST_MESSAGE_CONTENT,
        }),
      },
    },
    expectedMessages: [{ role: GEN_AI_MESSAGE_ROLES.ASSISTANT, content: TEST_MESSAGE_CONTENT }],
  },
};
