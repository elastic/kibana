/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from '@kbn/core/server';

import { CONNECTORS_INDEX } from '..';
import { fetchConnectorById } from './fetch_connectors';
import { ConnectorStatus } from '../types/connectors';

import { updateConnectorConfiguration } from './update_connector_configuration';

jest.mock('./fetch_connectors', () => ({ fetchConnectorById: jest.fn() }));

describe('updateConnectorConfiguration lib function', () => {
  const mockClient = {
    update: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (fetchConnectorById as jest.Mock).mockResolvedValue({
      configuration: { test: { label: 'haha', value: 'this' } },
      id: 'connectorId',
      status: ConnectorStatus.NEEDS_CONFIGURATION,
    });
  });

  it('should update configuration', async () => {
    await expect(
      updateConnectorConfiguration(mockClient as unknown as ElasticsearchClient, 'connectorId', {
        test: 'newValue',
      })
    ).resolves.toEqual({ test: { label: 'haha', value: 'newValue' } });
    expect(mockClient.update).toHaveBeenCalledWith({
      doc: {
        configuration: { test: { label: 'haha', value: 'newValue' } },
        status: ConnectorStatus.CONFIGURED,
      },
      id: 'connectorId',
      index: CONNECTORS_INDEX,
    });
  });

  it('should reject if connector does not exist', async () => {
    (fetchConnectorById as jest.Mock).mockImplementation(() => undefined);

    await expect(
      updateConnectorConfiguration(mockClient as unknown as ElasticsearchClient, 'connectorId', {
        test: 'newValue',
      })
    ).rejects.toEqual(new Error('Could not find connector'));
    expect(mockClient.update).not.toHaveBeenCalled();
  });
});
