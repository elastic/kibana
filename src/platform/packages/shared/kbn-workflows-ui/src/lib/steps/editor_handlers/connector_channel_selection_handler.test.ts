/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import type { SelectionContext } from '@kbn/workflows/types/latest';
import {
  type ConnectorChannelSelectionHandlerServices,
  getConnectorChannelSelectionHandler,
} from './connector_channel_selection_handler';

const contextWithConnector = (connectorId?: string): SelectionContext =>
  ({
    stepType: 'elastic_apps_slack.sendMessage',
    scope: 'input',
    propertyKey: 'channel',
    values: { config: connectorId ? { 'connector-id': connectorId } : {}, input: {} },
  } as SelectionContext);

describe('getConnectorChannelSelectionHandler', () => {
  const post = jest.fn();
  const services = {
    http: { post } as unknown as HttpStart,
  } as ConnectorChannelSelectionHandlerServices;

  const createHandler = () =>
    getConnectorChannelSelectionHandler(services, { subAction: 'listChannels' });

  beforeEach(() => {
    jest.clearAllMocks();
    post.mockResolvedValue({
      status: 'ok',
      data: {
        ok: true,
        channels: [
          { id: 'C001', name: 'general' },
          { id: 'C002', name: 'alerts' },
        ],
      },
    });
  });

  it('declares connector-id as a dependency so the step instance is available', () => {
    expect(createHandler().dependsOnValues).toEqual(['config.connector-id']);
  });

  describe('search', () => {
    it('executes the configured sub-action on the step connector', async () => {
      await createHandler().search('', contextWithConnector('elastic-apps-slack'));

      expect(post).toHaveBeenCalledWith('/api/actions/connector/elastic-apps-slack/_execute', {
        body: JSON.stringify({ params: { subAction: 'listChannels', subActionParams: {} } }),
      });
    });

    it('offers the channel id as the value and the name as the label', async () => {
      await expect(createHandler().search('', contextWithConnector('c1'))).resolves.toEqual([
        expect.objectContaining({ value: 'C001', label: '#general' }),
        expect.objectContaining({ value: 'C002', label: '#alerts' }),
      ]);
    });

    it('filters by name or id against the typed query', async () => {
      const handler = createHandler();

      await expect(handler.search('gen', contextWithConnector('c1'))).resolves.toEqual([
        expect.objectContaining({ value: 'C001' }),
      ]);
      await expect(handler.search('C002', contextWithConnector('c1'))).resolves.toEqual([
        expect.objectContaining({ value: 'C002' }),
      ]);
    });

    it('caps the number of suggestions', async () => {
      post.mockResolvedValue({
        status: 'ok',
        data: {
          ok: true,
          channels: Array.from({ length: 30 }, (_, i) => ({ id: `C${i}`, name: `channel-${i}` })),
        },
      });

      const options = await getConnectorChannelSelectionHandler(services, {
        subAction: 'listChannels',
        maxResults: 5,
      }).search('', contextWithConnector('c1'));

      expect(options).toHaveLength(5);
    });

    it('suggests nothing when the step has no connector to ask', async () => {
      await expect(createHandler().search('', contextWithConnector())).resolves.toEqual([]);
      expect(post).not.toHaveBeenCalled();
    });

    it('suggests nothing when the execute call fails', async () => {
      post.mockRejectedValue(new Error('boom'));

      await expect(createHandler().search('', contextWithConnector('c1'))).resolves.toEqual([]);
    });

    it('suggests nothing when the connector reports an error', async () => {
      post.mockResolvedValue({ status: 'error', message: 'not connected' });

      await expect(createHandler().search('', contextWithConnector('c1'))).resolves.toEqual([]);
    });
  });

  describe('resolve', () => {
    it('resolves a known channel id to its option', async () => {
      await expect(createHandler().resolve('C002', contextWithConnector('c1'))).resolves.toEqual(
        expect.objectContaining({ value: 'C002', label: '#alerts' })
      );
    });

    it('returns null for a channel that is not connected', async () => {
      await expect(createHandler().resolve('C999', contextWithConnector('c1'))).resolves.toBeNull();
    });

    it('returns null when there is no connector on the step', async () => {
      await expect(createHandler().resolve('C001', contextWithConnector())).resolves.toBeNull();
    });
  });

  describe('getDetails', () => {
    it('confirms a resolved channel', async () => {
      const option = { value: 'C001', label: '#general' };

      await expect(
        createHandler().getDetails('C001', contextWithConnector('c1'), option)
      ).resolves.toEqual(expect.objectContaining({ message: expect.stringContaining('#general') }));
    });

    it('warns that an unresolved channel is rejected at run time', async () => {
      await expect(
        createHandler().getDetails('C999', contextWithConnector('c1'), null)
      ).resolves.toEqual(
        expect.objectContaining({ message: expect.stringContaining('not a connected channel') })
      );
    });
  });
});
