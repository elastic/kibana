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

import { inspectorPluginMock } from '../mocks';
import { DataAdapter } from '../adapters/data/data_adapter';
import { RequestAdapter } from '../adapters/request/request_adapter';

const adapter1 = new DataAdapter();
const adapter2 = new RequestAdapter();

describe('inspector', () => {
  describe('isAvailable()', () => {
    it('should return false if no view would be available', async () => {
      const { doStart } = await inspectorPluginMock.createPlugin();
      const start = await doStart();
      expect(start.isAvailable({ adapter1 })).toBe(false);
    });

    it('should return true if views would be available, false otherwise', async () => {
      const { setup, doStart } = await inspectorPluginMock.createPlugin();

      setup.registerView({
        title: 'title',
        help: 'help',
        shouldShow(adapters: any) {
          return 'adapter1' in adapters;
        },
      } as any);

      const start = await doStart();

      expect(start.isAvailable({ adapter1 })).toBe(true);
      expect(start.isAvailable({ adapter2 })).toBe(false);
    });
  });
});
