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

import { registryMock, managerMock } from './plugin.test.mocks';
import { SharePlugin } from './plugin';
import { CoreStart } from 'kibana/public';
import { coreMock } from '../../../core/public/mocks';

describe('SharePlugin', () => {
  beforeEach(() => {
    managerMock.start.mockClear();
    registryMock.setup.mockClear();
    registryMock.start.mockClear();
  });

  describe('setup', () => {
    test('wires up and returns registry', async () => {
      const coreSetup = coreMock.createSetup();
      const setup = await new SharePlugin().setup(coreSetup);
      expect(registryMock.setup).toHaveBeenCalledWith();
      expect(setup.register).toBeDefined();
    });

    test('registers redirect app', async () => {
      const coreSetup = coreMock.createSetup();
      await new SharePlugin().setup(coreSetup);
      expect(coreSetup.application.register).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'short_url_redirect',
        })
      );
    });
  });

  describe('start', () => {
    test('wires up and returns show function, but not registry', async () => {
      const coreSetup = coreMock.createSetup();
      const service = new SharePlugin();
      await service.setup(coreSetup);
      const start = await service.start({} as CoreStart);
      expect(registryMock.start).toHaveBeenCalled();
      expect(managerMock.start).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ getShareMenuItems: expect.any(Function) })
      );
      expect(start.toggleShareContextMenu).toBeDefined();
    });
  });
});
