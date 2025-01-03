/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Config, ObjectToConfigAdapter } from '..';

/**
 * Overrides some config values with ones from argv.
 *
 * @param config `Config` instance to update config values for.
 * @param argv Argv object with key/value pairs.
 */
export function overrideConfigWithArgv(config: Config, argv: { [key: string]: any }) {
  if (argv.port != null) {
    config.set(['server', 'port'], argv.port);
  }

  if (argv.host != null) {
    config.set(['server', 'host'], argv.host);
  }

  return config;
}

test('port', () => {
  const argv = {
    port: 123,
  };

  const config = new ObjectToConfigAdapter({
    server: { port: 456 },
  });

  overrideConfigWithArgv(config, argv);

  expect(config.get('server.port')).toEqual(123);
});

test('host', () => {
  const argv = {
    host: 'example.org',
  };

  const config = new ObjectToConfigAdapter({
    server: { host: 'org.example' },
  });

  overrideConfigWithArgv(config, argv);

  expect(config.get('server.host')).toEqual('example.org');
});

test('ignores unknown', () => {
  const argv = {
    unknown: 'some value',
  };

  const config = new ObjectToConfigAdapter({});
  jest.spyOn(config, 'set');

  overrideConfigWithArgv(config, argv);

  expect(config.set).not.toHaveBeenCalled();
});
