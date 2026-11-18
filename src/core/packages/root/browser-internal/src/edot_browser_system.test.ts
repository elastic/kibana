/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const startBrowserSdk = jest.fn();
jest.mock('@elastic/opentelemetry-browser', () => ({ startBrowserSdk }));

import { EdotBrowserSystem } from './edot_browser_system';

describe('EdotBrowserSystem', () => {
  beforeEach(() => {
    startBrowserSdk.mockClear();
  });

  it('does not start the SDK without config', async () => {
    await new EdotBrowserSystem(null, '9.5.0').setup();
    expect(startBrowserSdk).not.toHaveBeenCalled();
  });

  it('starts the SDK with the injected config', async () => {
    const config = { url: 'https://otlp.example.com', headers: { 'x-key': 'abc' } };

    await new EdotBrowserSystem(config, '9.5.0').setup();

    expect(startBrowserSdk).toHaveBeenCalledTimes(1);
    expect(startBrowserSdk).toHaveBeenCalledWith({
      serviceName: 'kibana-frontend',
      serviceVersion: '9.5.0',
      exportConfig: config,
      ignoreFetchUrls: [config.url],
    });
  });
});
