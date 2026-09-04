/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { ActionContext } from '../../connector_spec';
import {
  getRelayConnection,
  relayListChannels,
  relayResolveChannelId,
  relaySendMessage,
  relayTest,
  slackRelay,
} from './relay';

const createLogger = () =>
  ({ debug: jest.fn(), error: jest.fn() } as unknown as jest.Mocked<Logger>);

const createContext = (
  secrets: Record<string, unknown>,
  relay?: { trigger?: jest.Mock; listBindings?: jest.Mock }
): ActionContext =>
  ({
    log: createLogger(),
    secrets,
    ...(relay ? { relay } : {}),
  } as unknown as ActionContext);

const relaySecrets = { authType: 'relay', tenantKey: 'team-A' };

/** What a `RelayRequestError` looks like to this package, which cannot import it. */
const relayError = (statusCode: number) =>
  Object.assign(new Error(`Relay request failed with status ${statusCode}`), { statusCode });

describe('getRelayConnection', () => {
  it('returns null for a connector holding its own Slack token', () => {
    expect(getRelayConnection(createContext({ authType: 'bearer' }))).toBeNull();
    expect(getRelayConnection(createContext({}))).toBeNull();
  });

  it('returns the client and tenant key under relay auth', () => {
    const relay = { trigger: jest.fn() };

    expect(getRelayConnection(createContext(relaySecrets, relay))).toEqual({
      client: relay,
      tenantKey: 'team-A',
    });
  });

  it('throws when there is no Relay configured', () => {
    expect(() => getRelayConnection(createContext(relaySecrets))).toThrow(
      /Elastic Slack app, which is not configured/
    );
  });

  it('throws when the connector is no longer linked to a workspace', () => {
    expect(() =>
      getRelayConnection(createContext({ authType: 'relay' }, { trigger: jest.fn() }))
    ).toThrow(/not linked to a Slack workspace/);
  });
});

describe('relaySendMessage', () => {
  const send = async (input: Record<string, unknown>, trigger: jest.Mock) => {
    const ctx = createContext(relaySecrets, { trigger });
    return relaySendMessage(
      { client: { trigger } as never, tenantKey: 'team-A' },
      ctx,
      input as Parameters<typeof relaySendMessage>[2]
    );
  };

  it('maps the input onto trigger and returns the posted timestamp as ts', async () => {
    const trigger = jest.fn().mockResolvedValue({ ref: '1700.0001', tenantKey: 'team-A' });

    await expect(send({ channel: 'C123', text: 'hello' }, trigger)).resolves.toEqual({
      ok: true,
      channel: 'C123',
      ts: '1700.0001',
    });
    expect(trigger).toHaveBeenCalledWith({
      tenantKey: 'team-A',
      channel: 'C123',
      message: 'hello',
    });
  });

  it('forwards threadTs when replying in a thread', async () => {
    const trigger = jest.fn().mockResolvedValue({ ref: '1700.0002', tenantKey: 'team-A' });

    await send({ channel: 'C123', text: 'reply', threadTs: '1700.0001' }, trigger);

    expect(trigger).toHaveBeenCalledWith(expect.objectContaining({ threadTs: '1700.0001' }));
  });

  it('restates a 403 as an unconnected channel', async () => {
    const trigger = jest.fn().mockRejectedValue(relayError(403));

    await expect(send({ channel: 'C123', text: 'hello' }, trigger)).rejects.toThrow(
      'Channel C123 is not connected. Connect it in the Elastic Slack app settings, then try again.'
    );
  });

  it('restates a 409 as an uninstalled app', async () => {
    const trigger = jest.fn().mockRejectedValue(relayError(409));

    await expect(send({ channel: 'C123', text: 'hello' }, trigger)).rejects.toThrow(
      /no longer installed/
    );
  });

  it('passes other failures through untouched', async () => {
    const cause = relayError(502);
    const trigger = jest.fn().mockRejectedValue(cause);

    await expect(send({ channel: 'C123', text: 'hello' }, trigger)).rejects.toBe(cause);
  });
});

describe('relayListChannels', () => {
  const list = async (input: Record<string, unknown>, listBindings: jest.Mock) =>
    relayListChannels(
      { client: { listBindings } as never, tenantKey: 'team-A' },
      createContext(relaySecrets, { listBindings }),
      { limit: 100, ...input } as Parameters<typeof relayListChannels>[2]
    );

  it('maps connected bindings onto conversations.list-shaped channels', async () => {
    const listBindings = jest.fn().mockResolvedValue({
      bindings: [
        { scope_id: 'C123', display_name: 'general', visibility: 'public' },
        { scope_id: 'C456', display_name: 'secrets', visibility: 'private' },
      ],
    });

    await expect(list({}, listBindings)).resolves.toEqual({
      ok: true,
      source: 'relay-bindings',
      channels: [
        { id: 'C123', name: 'general', is_private: false },
        { id: 'C456', name: 'secrets', is_private: true },
      ],
      nextCursor: undefined,
      hasMore: false,
    });
  });

  it('falls back to the channel id when a binding has no display snapshot', async () => {
    const listBindings = jest.fn().mockResolvedValue({ bindings: [{ scope_id: 'C123' }] });

    await expect(list({}, listBindings)).resolves.toMatchObject({
      channels: [{ id: 'C123', name: 'C123', is_private: false }],
    });
  });

  it('drops a binding carrying no channel id', async () => {
    const listBindings = jest
      .fn()
      .mockResolvedValue({ bindings: [{ display_name: 'orphan' }, { scope_id: 'C123' }] });

    await expect(list({}, listBindings)).resolves.toMatchObject({
      channels: [{ id: 'C123' }],
    });
  });

  it('keeps a private channel even when types asks for public only', async () => {
    const listBindings = jest
      .fn()
      .mockResolvedValue({ bindings: [{ scope_id: 'C456', visibility: 'private' }] });

    await expect(
      list({ types: ['public_channel'], excludeArchived: true }, listBindings)
    ).resolves.toMatchObject({ channels: [{ id: 'C456', is_private: true }] });
  });

  it('reports more pages and forwards the cursor back', async () => {
    const listBindings = jest
      .fn()
      .mockResolvedValue({ bindings: [{ scope_id: 'C123' }], nextCursor: 'page-2' });

    await expect(list({ cursor: 'page-1' }, listBindings)).resolves.toMatchObject({
      nextCursor: 'page-2',
      hasMore: true,
    });
    expect(listBindings).toHaveBeenCalledWith('team-A', { limit: 100, cursor: 'page-1' });
  });

  it('clamps a limit above the Relay page maximum', async () => {
    const listBindings = jest.fn().mockResolvedValue({ bindings: [] });

    await list({ limit: 1000 }, listBindings);

    expect(listBindings).toHaveBeenCalledWith('team-A', { limit: 200 });
  });

  it('ignores raw and still returns the compact channel shape', async () => {
    const listBindings = jest.fn().mockResolvedValue({
      bindings: [{ scope_id: 'C123', display_name: 'general', visibility: 'public' }],
      nextCursor: 'page-2',
    });

    await expect(list({ raw: true }, listBindings)).resolves.toEqual({
      ok: true,
      source: 'relay-bindings',
      channels: [{ id: 'C123', name: 'general', is_private: false }],
      nextCursor: 'page-2',
      hasMore: true,
    });
  });

  it('restates a 403 without naming a channel', async () => {
    const listBindings = jest.fn().mockRejectedValue(relayError(403));

    await expect(list({}, listBindings)).rejects.toThrow(
      'This connector is not allowed to read the connected channels. Reconnect the Elastic Slack app, then try again.'
    );
  });

  it('restates a 409 as an uninstalled app', async () => {
    const listBindings = jest.fn().mockRejectedValue(relayError(409));

    await expect(list({}, listBindings)).rejects.toThrow(/no longer installed/);
  });

  it('passes other failures through untouched', async () => {
    const cause = relayError(502);
    const listBindings = jest.fn().mockRejectedValue(cause);

    await expect(list({}, listBindings)).rejects.toBe(cause);
  });
});

describe('relayResolveChannelId', () => {
  const resolve = async (input: Record<string, unknown>, listBindings: jest.Mock) =>
    relayResolveChannelId(
      { client: { listBindings } as never, tenantKey: 'team-A' },
      createContext(relaySecrets, { listBindings }),
      { match: 'exact', limit: 100, maxPages: 3, ...input } as Parameters<
        typeof relayResolveChannelId
      >[2]
    );

  it('resolves an exact name, ignoring a leading hash and case', async () => {
    const listBindings = jest
      .fn()
      .mockResolvedValue({ bindings: [{ scope_id: 'C123', display_name: 'General' }] });

    await expect(resolve({ name: '#general' }, listBindings)).resolves.toEqual({
      ok: true,
      found: true,
      id: 'C123',
      name: 'General',
      source: 'relay-bindings',
      pagesFetched: 1,
      nextCursor: undefined,
    });
  });

  it('does not match a partial name under exact', async () => {
    const listBindings = jest
      .fn()
      .mockResolvedValue({ bindings: [{ scope_id: 'C123', display_name: 'general-alerts' }] });

    await expect(resolve({ name: 'general' }, listBindings)).resolves.toMatchObject({
      found: false,
    });
  });

  it('matches a partial name under contains', async () => {
    const listBindings = jest
      .fn()
      .mockResolvedValue({ bindings: [{ scope_id: 'C123', display_name: 'general-alerts' }] });

    await expect(
      resolve({ name: 'general', match: 'contains' }, listBindings)
    ).resolves.toMatchObject({ found: true, id: 'C123' });
  });

  it('walks to a later page to find the channel', async () => {
    const listBindings = jest
      .fn()
      .mockResolvedValueOnce({
        bindings: [{ scope_id: 'C111', display_name: 'other' }],
        nextCursor: 'page-2',
      })
      .mockResolvedValueOnce({ bindings: [{ scope_id: 'C123', display_name: 'general' }] });

    await expect(resolve({ name: 'general' }, listBindings)).resolves.toMatchObject({
      found: true,
      id: 'C123',
      pagesFetched: 2,
    });
    expect(listBindings).toHaveBeenLastCalledWith('team-A', { limit: 100, cursor: 'page-2' });
  });

  it('stops at maxPages and reports where it got to', async () => {
    const listBindings = jest.fn().mockResolvedValue({
      bindings: [{ scope_id: 'C111', display_name: 'other' }],
      nextCursor: 'next',
    });

    await expect(resolve({ name: 'general', maxPages: 2 }, listBindings)).resolves.toMatchObject({
      found: false,
      id: undefined,
      name: 'general',
      pagesFetched: 2,
      nextCursor: 'next',
    });
    expect(listBindings).toHaveBeenCalledTimes(2);
  });

  it('reports not found without a cursor once the pages run out', async () => {
    const listBindings = jest.fn().mockResolvedValue({ bindings: [] });

    await expect(resolve({ name: 'general' }, listBindings)).resolves.toMatchObject({
      found: false,
      nextCursor: undefined,
      pagesFetched: 1,
    });
  });
});

describe('relayTest', () => {
  it('proves the Relay path by reading a single binding', async () => {
    const listBindings = jest.fn().mockResolvedValue({ bindings: [{ scope_id: 'C123' }] });

    await expect(
      relayTest(
        { client: { listBindings } as never, tenantKey: 'team-A' },
        createContext(relaySecrets, { listBindings })
      )
    ).resolves.toEqual({});
    expect(listBindings).toHaveBeenCalledWith('team-A', { limit: 1 });
  });

  it('fails with the restated reason when the workspace is gone', async () => {
    const listBindings = jest.fn().mockRejectedValue(relayError(409));

    await expect(
      relayTest(
        { client: { listBindings } as never, tenantKey: 'team-A' },
        createContext(relaySecrets, { listBindings })
      )
    ).rejects.toThrow(/no longer installed/);
  });
});

describe('slackRelay.assertNotSupported', () => {
  it('returns without throwing for a connector holding its own Slack token', () => {
    expect(() =>
      slackRelay.assertNotSupported(createContext({ authType: 'bearer' }), 'searchMessages')
    ).not.toThrow();
    expect(() => slackRelay.assertNotSupported(createContext({}), 'searchMessages')).not.toThrow();
  });

  it('throws naming the action and the supported list under relay auth', () => {
    expect(() =>
      slackRelay.assertNotSupported(
        createContext(relaySecrets, { trigger: jest.fn() }),
        'searchMessages'
      )
    ).toThrow(
      'searchMessages is not available through the Elastic Slack app. Supported actions: sendMessage, listChannels, resolveChannelId.'
    );
  });
});
