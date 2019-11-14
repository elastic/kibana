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

describe('SharePlugin', () => {
  beforeEach(() => {
    managerMock.start.mockClear();
    registryMock.setup.mockClear();
    registryMock.start.mockClear();
  });

  describe('setup', () => {
    test('wires up and returns registry', async () => {
      const setup = await new SharePlugin().setup();
      expect(registryMock.setup).toHaveBeenCalledWith();
      expect(setup.register).toBeDefined();
    });
  });

  describe('start', () => {
    test('wires up and returns show function, but not registry', async () => {
      const service = new SharePlugin();
      await service.setup();
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
