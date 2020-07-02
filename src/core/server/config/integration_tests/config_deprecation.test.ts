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

import { mockLoggingSystem } from './config_deprecation.test.mocks';
import { loggingSystemMock } from '../../logging/logging_system.mock';
import * as kbnTestServer from '../../../../test_utils/kbn_server';

describe('configuration deprecations', () => {
  let root: ReturnType<typeof kbnTestServer.createRoot>;

  afterEach(async () => {
    if (root) {
      await root.shutdown();
    }
  });

  it('should not log deprecation warnings for default configuration', async () => {
    root = kbnTestServer.createRoot();

    await root.setup();

    const logs = loggingSystemMock.collect(mockLoggingSystem);
    const warnings = logs.warn.flatMap((i) => i);
    expect(warnings).not.toContain(
      '"optimize.lazy" is deprecated and has been replaced by "optimize.watch"'
    );
    expect(warnings).not.toContain(
      '"optimize.lazyPort" is deprecated and has been replaced by "optimize.watchPort"'
    );
  });

  it('should log deprecation warnings for core deprecations', async () => {
    root = kbnTestServer.createRoot({
      optimize: {
        lazy: true,
        lazyPort: 9090,
      },
    });

    await root.setup();

    const logs = loggingSystemMock.collect(mockLoggingSystem);
    const warnings = logs.warn.flatMap((i) => i);
    expect(warnings).toContain(
      '"optimize.lazy" is deprecated and has been replaced by "optimize.watch"'
    );
    expect(warnings).toContain(
      '"optimize.lazyPort" is deprecated and has been replaced by "optimize.watchPort"'
    );
  });
});
