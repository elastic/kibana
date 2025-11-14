/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod';
import {
  validateBlockkit,
  validateChannelName,
  PostMessageSubActionParamsSchema,
  SlackApiConfigSchema,
  MAX_ALLOWED_CHANNELS,
} from './v1';

const ctx = {
  addIssue: jest.fn(),
} as unknown as z.RefinementCtx;

describe('Slack Api Schema validation', () => {
  describe('validateBlockkit', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should add error for invalid json', () => {
      validateBlockkit('', ctx);
      validateBlockkit('abc', ctx);

      expect(ctx.addIssue).toHaveBeenCalledTimes(2);
      expect(ctx.addIssue).toHaveBeenNthCalledWith(1, {
        code: 'custom',
        message: 'block kit body is not valid JSON - Unexpected end of JSON input',
      });
      expect(ctx.addIssue).toHaveBeenNthCalledWith(2, {
        code: 'custom',
        message:
          'block kit body is not valid JSON - Unexpected token \'a\', "abc" is not valid JSON',
      });
    });

    test('should add error for json that does not contain the "blocks" field', () => {
      validateBlockkit(JSON.stringify({ foo: 'bar' }), ctx);
      expect(ctx.addIssue).toHaveBeenCalledTimes(1);
      expect(ctx.addIssue).toHaveBeenNthCalledWith(1, {
        code: 'custom',
        message: `block kit body must contain field \"blocks\"`,
      });
    });

    test('should add nothing for valid blockkit text', () => {
      validateBlockkit(
        JSON.stringify({
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: 'Hello',
              },
            },
          ],
        }),
        ctx
      );
      expect(ctx.addIssue).not.toHaveBeenCalled();
    });
  });

  describe('Validate channel name', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should add error if the channel name does not start with #', () => {
      validateChannelName('general', ctx);
      expect(ctx.addIssue).toHaveBeenNthCalledWith(1, {
        code: 'custom',
        message: 'Channel name must start with #',
      });
    });

    test('should add nothing for valid channel names starting with #', () => {
      validateChannelName('#general', ctx);
      validateChannelName('#channel-123', ctx);

      expect(ctx.addIssue).not.toHaveBeenCalled();
    });

    test('should add nothing for channel names with special characters', () => {
      validateChannelName('#test-team', ctx);
      validateChannelName('#incident-*', ctx);

      expect(ctx.addIssue).not.toHaveBeenCalled();
    });

    test('should add error for empty strings', () => {
      validateChannelName('', ctx);
      expect(ctx.addIssue).toHaveBeenNthCalledWith(1, {
        code: 'custom',
        message: 'Channel name cannot be empty',
      });
    });

    test('should add error for undefined values', () => {
      validateChannelName(undefined, ctx);
      expect(ctx.addIssue).toHaveBeenNthCalledWith(1, {
        code: 'custom',
        message: 'Channel name cannot be empty',
      });
    });
  });

  describe('SlackApiConfigSchema', () => {
    test('should not throw if all properties are missing', () => {
      expect(() => SlackApiConfigSchema.parse({})).not.toThrow();
    });

    test('should throw with excess fields', () => {
      expect(() =>
        SlackApiConfigSchema.parse({ allowedChannels: [{ name: '#channel-name' }], foo: 'bar' })
      ).toThrow();
    });

    test('should throw if allowedChannels.id is missing', () => {
      expect(() =>
        SlackApiConfigSchema.parse({ allowedChannels: [{ name: '#channel-name' }] })
      ).not.toThrow();
    });

    test('should throw if allowedChannels.name is missing', () => {
      expect(() => SlackApiConfigSchema.parse({ allowedChannels: [{}] })).toThrow();
    });

    test('should throw if allowedChannels.id is empty', () => {
      expect(() =>
        SlackApiConfigSchema.parse({ allowedChannels: [{ id: '', name: '#channel-name' }] })
      ).toThrow();
    });

    test('should throw if allowedChannels.name is empty', () => {
      expect(() =>
        SlackApiConfigSchema.parse({ allowedChannels: [{ id: 'channel-id', name: '' }] })
      ).toThrow();
    });

    test('should throw with excess fields in allowedChannels', () => {
      expect(() =>
        SlackApiConfigSchema.parse({
          allowedChannels: [{ name: '#channel-name', foo: 'bar' }],
        })
      ).toThrow();
    });

    test(`should throw if allowedChannels is more than ${MAX_ALLOWED_CHANNELS}`, () => {
      expect(() =>
        SlackApiConfigSchema.parse({
          allowedChannels: Array.from({ length: MAX_ALLOWED_CHANNELS + 1 }, (_, i) => ({
            id: `channel-id-${i}`,
            name: `#channel-name-${i}`,
          })),
        })
      ).toThrow();
    });
  });

  describe('PostMessageSubActionParamsSchema', () => {
    test('should throw if text is missing', () => {
      expect(() => PostMessageSubActionParamsSchema.parse({})).toThrow();
    });

    test('should not throw if text is not missing', () => {
      expect(() => PostMessageSubActionParamsSchema.parse({ text: 'hello' })).not.toThrow();
    });

    test('should throw if channelNames is too short', () => {
      expect(() =>
        PostMessageSubActionParamsSchema.parse({ text: 'hello', channelNames: ['#'] })
      ).toThrow();
    });

    test('should throw if channelNames is too long', () => {
      expect(() =>
        PostMessageSubActionParamsSchema.parse({ text: 'hello', channelNames: ['#'.repeat(201)] })
      ).toThrow();
    });

    test('should throw if channelNames does not start with #', () => {
      expect(() =>
        PostMessageSubActionParamsSchema.parse({ text: 'hello', channelNames: ['general'] })
      ).toThrow();
    });

    test('should not throw with valid names', () => {
      expect(() =>
        PostMessageSubActionParamsSchema.parse({ text: 'hello', channelNames: ['#general'] })
      ).not.toThrow();
    });
  });
});
