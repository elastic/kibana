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

import { LegacyKbnServer } from '..';

test('correctly returns `newPlatformProxyListener`.', () => {
  const rawKbnServer = {
    newPlatform: {
      proxyListener: {},
    },
  };

  const legacyKbnServer = new LegacyKbnServer(rawKbnServer);
  expect(legacyKbnServer.newPlatformProxyListener).toBe(rawKbnServer.newPlatform.proxyListener);
});

test('correctly forwards log record.', () => {
  const rawKbnServer = {
    server: { log: jest.fn() },
  };

  const legacyKbnServer = new LegacyKbnServer(rawKbnServer);

  const timestamp = new Date(Date.UTC(2012, 1, 1, 11, 22, 33, 44));
  legacyKbnServer.log(['one', 'two'], 'message', timestamp);
  legacyKbnServer.log('three', new Error('log error'), timestamp);

  expect(rawKbnServer.server.log.mock.calls).toMatchSnapshot();
});
