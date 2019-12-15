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

import { ShareMenuRegistry } from './share_menu_registry';
import { ShareMenuItem, ShareContext } from '../types';

describe('ShareActionsRegistry', () => {
  describe('setup', () => {
    test('throws when registering duplicate id', () => {
      const setup = new ShareMenuRegistry().setup();
      setup.register({
        id: 'myTest',
        getShareMenuItems: () => [],
      });
      expect(() =>
        setup.register({
          id: 'myTest',
          getShareMenuItems: () => [],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Share menu provider with id [myTest] has already been registered. Use a unique id."`
      );
    });
  });

  describe('start', () => {
    describe('getActions', () => {
      test('returns a flat list of actions returned by all providers', () => {
        const service = new ShareMenuRegistry();
        const registerFunction = service.setup().register;
        const shareAction1 = {} as ShareMenuItem;
        const shareAction2 = {} as ShareMenuItem;
        const shareAction3 = {} as ShareMenuItem;
        const provider1Callback = jest.fn(() => [shareAction1]);
        const provider2Callback = jest.fn(() => [shareAction2, shareAction3]);
        registerFunction({
          id: 'myTest',
          getShareMenuItems: provider1Callback,
        });
        registerFunction({
          id: 'myTest2',
          getShareMenuItems: provider2Callback,
        });
        const context = {} as ShareContext;
        expect(service.start().getShareMenuItems(context)).toEqual([
          shareAction1,
          shareAction2,
          shareAction3,
        ]);
        expect(provider1Callback).toHaveBeenCalledWith(context);
        expect(provider2Callback).toHaveBeenCalledWith(context);
      });
    });
  });
});
