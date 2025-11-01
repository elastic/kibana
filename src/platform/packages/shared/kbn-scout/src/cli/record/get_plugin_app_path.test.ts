/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getPluginPath, getAppRouteFromPlugin } from './get_plugin_app_path';

describe('getPluginPath', () => {
  it('should return the correct plugin path', async () => {
    const pluginPath = await getPluginPath('maps-plugin');
    expect(pluginPath).toBe('x-pack/platform/plugins/shared/maps');
  });

  it('should throw an error if the plugin path is not found', async () => {
    await expect(getPluginPath('not-a-plugin')).rejects.toThrow(
      'Plugin path not found for not-a-plugin'
    );
  });
});

describe('getAppRouteFromPlugin', () => {
  it('should return the correct app route when no appRoute is defined', async () => {
    const appRoute = await getAppRouteFromPlugin(
      'x-pack/platform/plugins/shared/maps/public/plugin.ts'
    );
    expect(appRoute).toBe('/app/maps');
  });

  it('should return the correct app route when appRoute is defined', async () => {
    const appRouteApm = await getAppRouteFromPlugin(
      'x-pack/solutions/observability/plugins/apm/public/plugin.ts'
    );
    expect(appRouteApm).toBe('/app/apm');

    const appRouteInfra = await getAppRouteFromPlugin(
      'x-pack/solutions/observability/plugins/infra/public/plugin.ts'
    );
    // Infra plugin registers two apps - logs (/app/logs) and metrics (/app/metrics)
    // The function returns the first one found
    expect(appRouteInfra).toBe('/app/logs');
  });

  it('should throw an error if the plugin app path is not found', async () => {
    await expect(getAppRouteFromPlugin('not-a-plugin/public/plugin.ts')).rejects.toThrow(
      'Plugin app path not found for not-a-plugin'
    );

    await expect(getAppRouteFromPlugin('x-pack/not-a-plugin/public/plugin.ts')).rejects.toThrow(
      'Plugin app path not found for not-a-plugin'
    );
  });
});
