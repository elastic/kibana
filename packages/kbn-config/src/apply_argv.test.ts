/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Config, ObjectToConfigAdapter } from '.';

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
