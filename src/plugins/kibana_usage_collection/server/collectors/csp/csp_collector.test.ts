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

import { CspConfig, ICspConfig } from '../../../../../core/server';
import { createCspCollector } from './csp_collector';
import { httpServiceMock } from '../../../../../core/server/mocks';

describe('csp collector', () => {
  let httpMock: ReturnType<typeof httpServiceMock.createSetupContract>;
  const mockCallCluster = null as any;

  function updateCsp(config: Partial<ICspConfig>) {
    httpMock.csp = new CspConfig(config);
  }

  beforeEach(() => {
    httpMock = httpServiceMock.createSetupContract();
  });

  test('fetches whether strict mode is enabled', async () => {
    const collector = createCspCollector(httpMock);

    expect((await collector.fetch(mockCallCluster)).strict).toEqual(true);

    updateCsp({ strict: false });
    expect((await collector.fetch(mockCallCluster)).strict).toEqual(false);
  });

  test('fetches whether the legacy browser warning is enabled', async () => {
    const collector = createCspCollector(httpMock);

    expect((await collector.fetch(mockCallCluster)).warnLegacyBrowsers).toEqual(true);

    updateCsp({ warnLegacyBrowsers: false });
    expect((await collector.fetch(mockCallCluster)).warnLegacyBrowsers).toEqual(false);
  });

  test('fetches whether the csp rules have been changed or not', async () => {
    const collector = createCspCollector(httpMock);

    expect((await collector.fetch(mockCallCluster)).rulesChangedFromDefault).toEqual(false);

    updateCsp({ rules: ['not', 'default'] });
    expect((await collector.fetch(mockCallCluster)).rulesChangedFromDefault).toEqual(true);
  });

  test('does not include raw csp rules under any property names', async () => {
    const collector = createCspCollector(httpMock);

    // It's important that we do not send the value of csp.rules here as it
    // can be customized with values that can be identifiable to given
    // installs, such as URLs
    //
    // We use a snapshot here to ensure csp.rules isn't finding its way into the
    // payload under some new and unexpected variable name (e.g. cspRules).
    expect(await collector.fetch(mockCallCluster)).toMatchInlineSnapshot(`
      Object {
        "rulesChangedFromDefault": false,
        "strict": true,
        "warnLegacyBrowsers": true,
      }
    `);
  });
});
