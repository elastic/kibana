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

import { loggerMock } from '../../logging/logger.mock';
import { logLegacyThirdPartyPluginDeprecationWarning } from './log_legacy_plugins_warning';
import { LegacyPluginSpec } from '../types';

const createPluginSpec = ({ id, path }: { id: string; path: string }): LegacyPluginSpec => {
  return {
    getId: () => id,
    getExpectedKibanaVersion: () => 'kibana',
    getConfigPrefix: () => 'plugin.config',
    getDeprecationsProvider: () => undefined,
    getPack: () => ({
      getPath: () => path,
    }),
  };
};

describe('logLegacyThirdPartyPluginDeprecationWarning', () => {
  let log: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    log = loggerMock.create();
  });

  it('logs warning for third party plugins', () => {
    logLegacyThirdPartyPluginDeprecationWarning({
      specs: [createPluginSpec({ id: 'plugin', path: '/some-external-path' })],
      log,
    });
    expect(log.warn).toHaveBeenCalledTimes(1);
    expect(log.warn.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "Some installed third party plugin(s) [plugin] are using the legacy plugin format and will no longer work in a future Kibana release. Please refer to https://ela.st/kibana-breaking-changes-8-0 for a list of breaking changes and https://ela.st/kibana-platform-migration for documentation on how to migrate legacy plugins.",
      ]
    `);
  });

  it('lists all the deprecated plugins and only log once', () => {
    logLegacyThirdPartyPluginDeprecationWarning({
      specs: [
        createPluginSpec({ id: 'pluginA', path: '/abs/path/to/pluginA' }),
        createPluginSpec({ id: 'pluginB', path: '/abs/path/to/pluginB' }),
        createPluginSpec({ id: 'pluginC', path: '/abs/path/to/pluginC' }),
      ],
      log,
    });
    expect(log.warn).toHaveBeenCalledTimes(1);
    expect(log.warn.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "Some installed third party plugin(s) [pluginA, pluginB, pluginC] are using the legacy plugin format and will no longer work in a future Kibana release. Please refer to https://ela.st/kibana-breaking-changes-8-0 for a list of breaking changes and https://ela.st/kibana-platform-migration for documentation on how to migrate legacy plugins.",
      ]
    `);
  });

  it('does not log warning for internal legacy plugins', () => {
    logLegacyThirdPartyPluginDeprecationWarning({
      specs: [
        createPluginSpec({
          id: 'plugin',
          path: '/absolute/path/to/kibana/src/legacy/core_plugins',
        }),
        createPluginSpec({
          id: 'plugin',
          path: '/absolute/path/to/kibana/x-pack',
        }),
      ],
      log,
    });

    expect(log.warn).not.toHaveBeenCalled();
  });
});
