/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getUpgradeableConfig } from './get_upgradeable_config';
import { savedObjectsClientMock } from '../../saved_objects/service/saved_objects_client.mock';
import { SavedObjectsFindResponse } from '../../saved_objects';

describe('getUpgradeableConfig', () => {
  it('finds saved objects with type "config"', async () => {
    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [{ id: '7.5.0', attributes: 'foo' }],
    } as SavedObjectsFindResponse);

    await getUpgradeableConfig({ savedObjectsClient, version: '7.5.0' });
    expect(savedObjectsClient.find.mock.calls[0][0].type).toBe('config');
  });

  it('finds saved config with version < than Kibana version', async () => {
    const savedConfig = { id: '7.4.0', attributes: 'foo' };
    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [savedConfig],
    } as SavedObjectsFindResponse);

    const result = await getUpgradeableConfig({ savedObjectsClient, version: '7.5.0' });
    expect(result).toEqual(savedConfig);
  });

  it('finds saved config with RC version === Kibana version', async () => {
    const savedConfig = { id: '7.5.0-rc1', attributes: 'foo' };
    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [savedConfig],
    } as SavedObjectsFindResponse);

    const result = await getUpgradeableConfig({ savedObjectsClient, version: '7.5.0' });
    expect(result).toEqual(savedConfig);
  });

  it('does not find saved config with version === Kibana version', async () => {
    const savedConfig = { id: '7.5.0', attributes: 'foo' };
    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [savedConfig],
    } as SavedObjectsFindResponse);

    const result = await getUpgradeableConfig({ savedObjectsClient, version: '7.5.0' });
    expect(result).toBe(null);
  });

  it('does not find saved config with version > Kibana version', async () => {
    const savedConfig = { id: '7.6.0', attributes: 'foo' };
    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [savedConfig],
    } as SavedObjectsFindResponse);

    const result = await getUpgradeableConfig({ savedObjectsClient, version: '7.5.0' });
    expect(result).toBe(null);
  });

  it('handles empty config', async () => {
    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [],
    } as unknown as SavedObjectsFindResponse);

    const result = await getUpgradeableConfig({ savedObjectsClient, version: '7.5.0' });
    expect(result).toBe(null);
  });
});
