/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { UiSettingsMetadataClient } from './ui_settings_metadata_client';

describe('UiSettingsMetadataClient', () => {
  it.each([
    ['namespace', '/internal/kibana/settings/metadata'],
    ['global', '/internal/kibana/global_settings/metadata'],
  ] as const)('#getAll(%s) fetches the setting definitions from %s', async (scope, path) => {
    const http = httpServiceMock.createSetupContract();
    const settings = {
      title: { name: 'Title', value: 'Kibana', description: 'The title of the page' },
    };
    http.fetch.mockResolvedValue({ settings });
    const client = new UiSettingsMetadataClient(http);

    await expect(client.getAll(scope)).resolves.toEqual(settings);
    expect(http.fetch).toHaveBeenCalledTimes(1);
    expect(http.fetch).toHaveBeenCalledWith(path, { method: 'GET' });
  });

  it('#getAll rejects when the request fails', async () => {
    const http = httpServiceMock.createSetupContract();
    http.fetch.mockRejectedValue(new Error('Request failed'));
    const client = new UiSettingsMetadataClient(http);

    await expect(client.getAll('namespace')).rejects.toThrow('Request failed');
  });
});
