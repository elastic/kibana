/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsFindResponse } from '@kbn/core-saved-objects-api-server';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { getUpgradeableConfig } from './get_upgradeable_config';

describe('getUpgradeableConfig', () => {
  it('finds saved objects with type "config"', async () => {
    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [{ id: '7.5.0', attributes: 'foo' }],
    } as SavedObjectsFindResponse);

    await getUpgradeableConfig({ savedObjectsClient, version: '7.5.0', type: 'config' });
    expect(savedObjectsClient.find.mock.calls[0][0].type).toBe('config');
  });

  it('finds saved objects with type "config-global"', async () => {
    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [{ id: '8.6.0', attributes: 'bar' }],
    } as SavedObjectsFindResponse);

    await getUpgradeableConfig({ savedObjectsClient, version: '7.5.0', type: 'config-global' });
    expect(savedObjectsClient.find.mock.calls[0][0].type).toBe('config-global');
  });

  it('finds saved config with version < than Kibana version', async () => {
    const savedConfig = { id: '7.4.0', attributes: 'foo' };
    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [savedConfig],
    } as SavedObjectsFindResponse);

    const result = await getUpgradeableConfig({
      savedObjectsClient,
      version: '7.5.0',
      type: 'config',
    });
    expect(result).toEqual(savedConfig);
  });

  it('uses the latest config when multiple are found', async () => {
    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [
        { id: '7.2.0', attributes: 'foo' },
        { id: '7.3.0', attributes: 'foo' },
      ],
    } as SavedObjectsFindResponse);

    const result = await getUpgradeableConfig({
      savedObjectsClient,
      version: '7.5.0',
      type: 'config',
    });
    expect(result!.id).toBe('7.3.0');
  });

  it('uses the latest config when multiple are found with rc qualifier', async () => {
    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [
        { id: '7.2.0', attributes: 'foo' },
        { id: '7.3.0', attributes: 'foo' },
        { id: '7.5.0-rc1', attributes: 'foo' },
      ],
    } as SavedObjectsFindResponse);

    const result = await getUpgradeableConfig({
      savedObjectsClient,
      version: '7.5.0',
      type: 'config',
    });
    expect(result!.id).toBe('7.5.0-rc1');
  });

  it('ignores documents with malformed ids', async () => {
    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [
        { id: 'not-a-semver', attributes: 'foo' },
        { id: '7.2.0', attributes: 'foo' },
        { id: '7.3.0', attributes: 'foo' },
      ],
    } as SavedObjectsFindResponse);

    const result = await getUpgradeableConfig({
      savedObjectsClient,
      version: '7.5.0',
      type: 'config',
    });
    expect(result!.id).toBe('7.3.0');
  });

  it('finds saved config with RC version === Kibana version', async () => {
    const savedConfig = { id: '7.5.0-rc1', attributes: 'foo' };
    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [savedConfig],
    } as SavedObjectsFindResponse);

    const result = await getUpgradeableConfig({
      savedObjectsClient,
      version: '7.5.0',
      type: 'config',
    });
    expect(result).toEqual(savedConfig);
  });

  it('does not find saved config with version === Kibana version', async () => {
    const savedConfig = { id: '7.5.0', attributes: 'foo' };
    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [savedConfig],
    } as SavedObjectsFindResponse);

    const result = await getUpgradeableConfig({
      savedObjectsClient,
      version: '7.5.0',
      type: 'config',
    });
    expect(result).toBe(null);
  });

  it('does not find saved config with version > Kibana version', async () => {
    const savedConfig = { id: '7.6.0', attributes: 'foo' };
    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [savedConfig],
    } as SavedObjectsFindResponse);

    const result = await getUpgradeableConfig({
      savedObjectsClient,
      version: '7.5.0',
      type: 'config',
    });
    expect(result).toBe(null);
  });

  it('handles empty config', async () => {
    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [],
    } as unknown as SavedObjectsFindResponse);

    const result = await getUpgradeableConfig({
      savedObjectsClient,
      version: '7.5.0',
      type: 'config',
    });
    expect(result).toBe(null);
  });
});
