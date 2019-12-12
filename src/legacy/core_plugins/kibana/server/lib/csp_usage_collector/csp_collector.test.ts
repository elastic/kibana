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

import sinon from 'sinon';
import { Server } from 'hapi';
import { CspConfig } from '../../../../../../core/server';
import { createCspCollector } from './csp_collector';

interface MockConfig {
  get: (x: string) => any;
}

const getMockKbnServer = (mockConfig: MockConfig) => ({
  config: () => mockConfig,
});

test('fetches whether strict mode is enabled', async () => {
  const { collector, mockConfig } = setupCollector();

  expect((await collector.fetch()).strict).toEqual(true);

  mockConfig.get.withArgs('csp.strict').returns(false);
  expect((await collector.fetch()).strict).toEqual(false);
});

test('fetches whether the legacy browser warning is enabled', async () => {
  const { collector, mockConfig } = setupCollector();

  expect((await collector.fetch()).warnLegacyBrowsers).toEqual(true);

  mockConfig.get.withArgs('csp.warnLegacyBrowsers').returns(false);
  expect((await collector.fetch()).warnLegacyBrowsers).toEqual(false);
});

test('fetches whether the csp rules have been changed or not', async () => {
  const { collector, mockConfig } = setupCollector();

  expect((await collector.fetch()).rulesChangedFromDefault).toEqual(false);

  mockConfig.get.withArgs('csp.rules').returns(['not', 'default']);
  expect((await collector.fetch()).rulesChangedFromDefault).toEqual(true);
});

test('does not include raw csp.rules under any property names', async () => {
  const { collector } = setupCollector();

  // It's important that we do not send the value of csp.rules here as it
  // can be customized with values that can be identifiable to given
  // installs, such as URLs
  //
  // We use a snapshot here to ensure csp.rules isn't finding its way into the
  // payload under some new and unexpected variable name (e.g. cspRules).
  expect(await collector.fetch()).toMatchInlineSnapshot(`
    Object {
      "rulesChangedFromDefault": false,
      "strict": true,
      "warnLegacyBrowsers": true,
    }
  `);
});

test('does not arbitrarily fetch other csp configurations (e.g. whitelist only)', async () => {
  const { collector, mockConfig } = setupCollector();

  mockConfig.get.withArgs('csp.foo').returns('bar');

  expect(await collector.fetch()).not.toHaveProperty('foo');
});

function setupCollector() {
  const mockConfig = { get: sinon.stub() };
  const defaultCspConfig = new CspConfig();
  mockConfig.get.withArgs('csp.rules').returns(defaultCspConfig.rules);
  mockConfig.get.withArgs('csp.strict').returns(defaultCspConfig.strict);
  mockConfig.get.withArgs('csp.warnLegacyBrowsers').returns(defaultCspConfig.warnLegacyBrowsers);

  const mockKbnServer = getMockKbnServer(mockConfig);

  return { mockConfig, collector: createCspCollector(mockKbnServer as Server) };
}
