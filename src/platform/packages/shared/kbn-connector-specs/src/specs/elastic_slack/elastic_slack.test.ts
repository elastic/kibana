/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext, RelayActionClient } from '../../connector_spec';
import { getConnectorSpec } from '../../..';
import { ElasticSlack } from './elastic_slack';

describe('ElasticSlack', () => {
  const trigger = jest.fn();
  const listBindings = jest.fn();
  const relay = { trigger, listBindings } as unknown as RelayActionClient;

  const createContext = (overrides: Partial<ActionContext> = {}): ActionContext =>
    ({
      relay,
      config: { tenantKey: 'team-A' },
      log: { debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
      ...overrides,
    } as unknown as ActionContext);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is discoverable via getConnectorSpec', () => {
    const spec = getConnectorSpec('.elastic_slack');

    expect(spec).toBe(ElasticSlack);
    expect(spec?.actions.sendMessage).toBeDefined();
    expect(spec?.actions.listChannels).toBeDefined();
  });

  it('declares no auth, since the Relay authenticates the deployment itself', () => {
    expect(ElasticSlack.auth).toBeUndefined();
  });

  describe('sendMessage', () => {
    it('posts through the Relay using the configured tenant key', async () => {
      trigger.mockResolvedValue({ ref: 'C123:1700000000.000100', tenantKey: 'team-A' });

      await expect(
        ElasticSlack.actions.sendMessage.handler(createContext(), {
          channel: 'C123',
          text: 'alert fired',
        })
      ).resolves.toEqual({ ok: true, channel: 'C123', ref: 'C123:1700000000.000100' });

      expect(trigger).toHaveBeenCalledWith({
        tenantKey: 'team-A',
        channel: 'C123',
        message: 'alert fired',
        threadTs: undefined,
      });
    });

    it('forwards threadTs when replying in a thread', async () => {
      trigger.mockResolvedValue({ ref: 'ref-1', tenantKey: 'team-A' });

      await ElasticSlack.actions.sendMessage.handler(createContext(), {
        channel: 'C123',
        text: 'reply',
        threadTs: '1700000000.000100',
      });

      expect(trigger).toHaveBeenCalledWith(
        expect.objectContaining({ threadTs: '1700000000.000100' })
      );
    });

    it('fails with a reconnect hint when the app is no longer connected', async () => {
      await expect(
        ElasticSlack.actions.sendMessage.handler(createContext({ config: {} }), {
          channel: 'C123',
          text: 'alert fired',
        })
      ).rejects.toThrow('The Elastic Slack app is not connected');

      expect(trigger).not.toHaveBeenCalled();
    });

    it('fails when the Relay is not configured on the deployment', async () => {
      await expect(
        ElasticSlack.actions.sendMessage.handler(createContext({ relay: undefined }), {
          channel: 'C123',
          text: 'alert fired',
        })
      ).rejects.toThrow('The Relay service is not configured');
    });
  });

  describe('listChannels', () => {
    it('maps bindings to channels, falling back to the id when there is no display name', async () => {
      listBindings.mockResolvedValue({
        bindings: [{ scope_id: 'C123', display_name: 'general' }, { scope_id: 'C456' }],
      });

      await expect(ElasticSlack.actions.listChannels.handler(createContext(), {})).resolves.toEqual(
        {
          ok: true,
          channels: [
            { id: 'C123', name: 'general' },
            { id: 'C456', name: 'C456' },
          ],
        }
      );

      expect(listBindings).toHaveBeenCalledWith('team-A', { cursor: undefined });
    });

    it('skips entries without a channel id', async () => {
      listBindings.mockResolvedValue({ bindings: [{ display_name: 'orphan' }] });

      await expect(ElasticSlack.actions.listChannels.handler(createContext(), {})).resolves.toEqual(
        { ok: true, channels: [] }
      );
    });

    it('follows the cursor across pages', async () => {
      listBindings
        .mockResolvedValueOnce({
          bindings: [{ scope_id: 'C123', display_name: 'general' }],
          nextCursor: 'cursor-2',
        })
        .mockResolvedValueOnce({ bindings: [{ scope_id: 'C456', display_name: 'random' }] });

      await expect(ElasticSlack.actions.listChannels.handler(createContext(), {})).resolves.toEqual(
        {
          ok: true,
          channels: [
            { id: 'C123', name: 'general' },
            { id: 'C456', name: 'random' },
          ],
        }
      );

      expect(listBindings).toHaveBeenNthCalledWith(2, 'team-A', { cursor: 'cursor-2' });
    });

    it('stops and warns when the Relay keeps returning cursors', async () => {
      listBindings.mockResolvedValue({
        bindings: [{ scope_id: 'C123' }],
        nextCursor: 'never-ending',
      });
      const ctx = createContext();

      const result = (await ElasticSlack.actions.listChannels.handler(ctx, {})) as {
        channels: unknown[];
      };

      expect(listBindings).toHaveBeenCalledTimes(10);
      expect(result.channels).toHaveLength(10);
      expect(ctx.log.warn).toHaveBeenCalledWith(expect.stringContaining('stopped after 10 pages'));
    });
  });

  describe('test handler', () => {
    it('reports the number of connected channels', async () => {
      listBindings.mockResolvedValue({ bindings: [{ scope_id: 'C123' }, { scope_id: 'C456' }] });

      await expect(ElasticSlack.test?.handler(createContext())).resolves.toEqual({
        ok: true,
        message: expect.stringContaining('2 channels'),
      });
    });
  });
});
