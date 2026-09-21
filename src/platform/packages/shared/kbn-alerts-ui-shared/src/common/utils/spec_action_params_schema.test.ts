/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { getMeta } from '@kbn/connector-specs';
import type { ConnectorSpecResponse } from '../apis/fetch_connector_spec';
import {
  applyActionInputFieldMeta,
  getSpecActionInputFieldKeys,
  getSpecActionInputSchema,
  getSpecDefaultSubAction,
  validateSpecActionParams,
} from './spec_action_params_schema';

const EMPTY_SLACK_LIKE_ERRORS = {
  subAction: [],
  query: [],
  channel: [],
  text: [],
  threadTs: [],
  unfurlLinks: [],
};

const slackLikeSpec = (): ConnectorSpecResponse => ({
  metadata: {
    id: '.slack2',
    displayName: 'Slack (v2)',
    description: 'Slack',
    minimumLicense: 'gold',
    supportedFeatureIds: ['alerting'],
  },
  schema: { type: 'object', properties: {} },
  actions: {
    searchMessages: {
      input: { type: 'object', properties: { query: { type: 'string' } } },
      scope: 'read',
    },
    sendMessage: {
      input: {
        type: 'object',
        required: ['channel', 'text'],
        properties: {
          channel: { type: 'string', minLength: 1, description: 'Conversation ID' },
          text: { type: 'string', minLength: 1, description: 'The message text to send' },
          threadTs: { type: 'string', description: 'Timestamp of another message to reply to' },
          unfurlLinks: {
            type: 'boolean',
            description: 'Whether to enable unfurling of primarily text-based content',
          },
        },
      },
      description: 'Send a message',
      scope: 'write',
    },
  },
  alerting: { defaultAction: 'sendMessage', messageField: 'text' },
  isTestable: true,
});

describe('spec_action_params_schema', () => {
  describe('getSpecDefaultSubAction', () => {
    it('returns the alerting hint default action when present', () => {
      expect(getSpecDefaultSubAction(slackLikeSpec())).toBe('sendMessage');
    });

    it('falls back to the first action key when there is no alerting hint', () => {
      const spec = slackLikeSpec();
      delete spec.alerting;
      expect(getSpecDefaultSubAction(spec)).toBe('searchMessages');
    });
  });

  describe('getSpecActionInputSchema', () => {
    it('derives a Zod object with string, optional string, and boolean fields', () => {
      const schema = getSpecActionInputSchema(slackLikeSpec(), 'sendMessage');
      expect(schema).toBeInstanceOf(z.ZodObject);
      expect(schema?.shape.channel).toBeDefined();
      expect(schema?.shape.text).toBeDefined();
      expect(schema?.shape.threadTs).toBeDefined();
      expect(schema?.shape.unfurlLinks).toBeDefined();
    });

    it('returns undefined for an unknown sub-action', () => {
      expect(getSpecActionInputSchema(slackLikeSpec(), 'missing')).toBeUndefined();
    });
  });

  describe('applyActionInputFieldMeta', () => {
    it('falls back to startCase labels and JSON Schema descriptions', () => {
      const schema = z.object({
        threadTs: z.string().optional(),
        unfurlLinks: z.boolean().optional(),
      });
      applyActionInputFieldMeta(schema, {
        type: 'object',
        properties: {
          threadTs: { type: 'string', description: 'Reply timestamp' },
          unfurlLinks: { type: 'boolean', description: 'Unfurl text links' },
        },
      });

      expect(getMeta(schema.shape.threadTs).label).toBe('Thread Ts');
      expect(getMeta(schema.shape.threadTs).helpText).toBe('Reply timestamp');
      expect(getMeta(schema.shape.unfurlLinks).label).toBe('Unfurl Links');
      expect(getMeta(schema.shape.unfurlLinks).helpText).toBe('Unfurl text links');
    });
  });

  describe('getSpecActionInputFieldKeys', () => {
    it('returns the union of input field names across all actions', () => {
      expect(getSpecActionInputFieldKeys(slackLikeSpec())).toEqual([
        'query',
        'channel',
        'text',
        'threadTs',
        'unfurlLinks',
      ]);
    });
  });

  describe('validateSpecActionParams', () => {
    it('maps a missing required text field to errors.text and keeps other keys empty', async () => {
      const result = await validateSpecActionParams(slackLikeSpec(), {
        subAction: 'sendMessage',
        subActionParams: { channel: 'C123' },
      });

      expect(result.errors).toEqual({
        ...EMPTY_SLACK_LIKE_ERRORS,
        text: [expect.any(String)],
      });
    });

    it('returns an empty array for every known field so hosts that merge per key clear stale errors', async () => {
      const invalid = await validateSpecActionParams(slackLikeSpec(), {
        subAction: 'sendMessage',
        subActionParams: {},
      });
      expect(invalid.errors.channel).toHaveLength(1);
      expect(invalid.errors.text).toHaveLength(1);

      const valid = await validateSpecActionParams(slackLikeSpec(), {
        subAction: 'sendMessage',
        subActionParams: { channel: 'C123', text: 'hello' },
      });
      expect({ ...invalid.errors, ...valid.errors }).toEqual(EMPTY_SLACK_LIKE_ERRORS);
    });

    it('clears errors from a previous action after switching to another action', async () => {
      const previous = await validateSpecActionParams(slackLikeSpec(), {
        subAction: 'sendMessage',
        subActionParams: {},
      });
      const next = await validateSpecActionParams(slackLikeSpec(), {
        subAction: 'searchMessages',
        subActionParams: {},
      });
      expect({ ...previous.errors, ...next.errors }).toEqual(EMPTY_SLACK_LIKE_ERRORS);
    });

    it('returns a subAction error when the action is missing or unknown', async () => {
      const missing = await validateSpecActionParams(slackLikeSpec(), {
        subActionParams: { text: 'hi' },
      });
      expect(missing.errors).toEqual({
        ...EMPTY_SLACK_LIKE_ERRORS,
        subAction: [expect.any(String)],
      });

      const unknown = await validateSpecActionParams(slackLikeSpec(), {
        subAction: 'notARealAction',
        subActionParams: {},
      });
      expect(unknown.errors).toEqual({
        ...EMPTY_SLACK_LIKE_ERRORS,
        subAction: [expect.any(String)],
      });
    });

    it('returns empty errors for the reserved test sub-action', async () => {
      const result = await validateSpecActionParams(slackLikeSpec(), {
        subAction: '_test',
        subActionParams: {},
      });
      expect(result.errors).toEqual(EMPTY_SLACK_LIKE_ERRORS);
    });

    it('returns empty errors when params are valid', async () => {
      const result = await validateSpecActionParams(slackLikeSpec(), {
        subAction: 'sendMessage',
        subActionParams: { channel: 'C123', text: 'hello' },
      });
      expect(result.errors).toEqual(EMPTY_SLACK_LIKE_ERRORS);
    });
  });
});
