/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createConnectors } from './create_connectors';
import { detectKibana, listConnectors, createConnector } from './kibana_client';
import { loadManifests, resolveManifestSecrets } from './manifest_loader';
import type { ToolingLog } from '@kbn/tooling-log';

jest.mock('./kibana_client');
jest.mock('./manifest_loader');

const detectKibanaMock = detectKibana as jest.MockedFunction<typeof detectKibana>;
const listConnectorsMock = listConnectors as jest.MockedFunction<typeof listConnectors>;
const createConnectorMock = createConnector as jest.MockedFunction<typeof createConnector>;
const loadManifestsMock = loadManifests as jest.MockedFunction<typeof loadManifests>;
const resolveManifestSecretsMock = resolveManifestSecrets as jest.MockedFunction<
  typeof resolveManifestSecrets
>;

const mockLog: ToolingLog = {
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  write: jest.fn(),
  success: jest.fn(),
} as any;

describe('createConnectors', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    detectKibanaMock.mockResolvedValue({ url: 'http://localhost:5601', auth: 'elastic:changeme' });
    listConnectorsMock.mockResolvedValue([]);
  });

  it('creates connectors from resolved manifests', async () => {
    loadManifestsMock.mockReturnValue([
      {
        spec_id: '.slack2',
        name: 'Slack (testing)',
        auth_type: 'bearer',
        secrets: { token: { vault: 'secret/path', field: 'token' } },
      },
    ]);
    resolveManifestSecretsMock.mockResolvedValue({
      specId: '.slack2',
      name: 'Slack (testing)',
      authType: 'bearer',
      config: {},
      secrets: { authType: 'bearer', token: 'xoxb-xxx' },
    });
    createConnectorMock.mockResolvedValue({ id: '123', name: 'Slack (testing)' });

    const results = await createConnectors({ log: mockLog, dryRun: false });

    expect(createConnectorMock).toHaveBeenCalledWith(
      { url: 'http://localhost:5601', auth: 'elastic:changeme' },
      {
        connector_type_id: '.slack2',
        name: 'Slack (testing)',
        config: {},
        secrets: { authType: 'bearer', token: 'xoxb-xxx' },
      }
    );
    expect(results).toEqual([
      { name: 'Slack (testing)', specId: '.slack2', status: 'created', connectorId: '123' },
    ]);
  });

  it('skips connectors that already exist by name', async () => {
    loadManifestsMock.mockReturnValue([
      {
        spec_id: '.slack2',
        name: 'Slack (testing)',
        auth_type: 'bearer',
        secrets: { token: { vault: 'secret/path', field: 'token' } },
      },
    ]);
    listConnectorsMock.mockResolvedValue([
      { id: 'existing', name: 'Slack (testing)', connector_type_id: '.slack2' },
    ]);

    const results = await createConnectors({ log: mockLog, dryRun: false });

    expect(createConnectorMock).not.toHaveBeenCalled();
    expect(results).toEqual([
      expect.objectContaining({ name: 'Slack (testing)', status: 'skipped' }),
    ]);
  });

  it('reports failed connectors and continues', async () => {
    loadManifestsMock.mockReturnValue([
      {
        spec_id: '.slack2',
        name: 'Slack (testing)',
        auth_type: 'bearer',
        secrets: { token: { vault: 'secret/path', field: 'token' } },
      },
      {
        spec_id: '.brave_search',
        name: 'Brave Search (testing)',
        auth_type: 'api_key_header',
        secrets: {
          headerField: { value: 'X-Subscription-Token' },
          apiKey: { vault: 'secret/path', field: 'api_key' },
        },
      },
    ]);
    resolveManifestSecretsMock
      .mockRejectedValueOnce(new Error('Vault denied'))
      .mockResolvedValueOnce({
        specId: '.brave_search',
        name: 'Brave Search (testing)',
        authType: 'api_key_header',
        config: {},
        secrets: { authType: 'api_key_header', headerField: 'X-Subscription-Token', apiKey: 'key' },
      });
    createConnectorMock.mockResolvedValue({ id: '456', name: 'Brave Search (testing)' });

    const results = await createConnectors({ log: mockLog, dryRun: false });

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual(
      expect.objectContaining({ name: 'Slack (testing)', status: 'failed' })
    );
    expect(results[1]).toEqual(
      expect.objectContaining({ name: 'Brave Search (testing)', status: 'created' })
    );
  });

  it('does not call createConnector or resolveManifestSecrets in dry-run mode', async () => {
    loadManifestsMock.mockReturnValue([
      {
        spec_id: '.slack2',
        name: 'Slack (testing)',
        auth_type: 'bearer',
        secrets: { token: { vault: 'secret/path', field: 'token' } },
      },
    ]);

    await createConnectors({ log: mockLog, dryRun: true });

    expect(resolveManifestSecretsMock).not.toHaveBeenCalled();
    expect(createConnectorMock).not.toHaveBeenCalled();
  });
});
