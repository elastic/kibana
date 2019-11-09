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

import { ShareAction, ShareActionProps, ShareActionsRegistry } from './share_actions_registry';

describe('ShareActionsRegistry', () => {
  describe('setup', () => {
    test('throws when registering duplicate id', () => {
      const setup = new ShareActionsRegistry().setup();
      setup.register({
        id: 'myTest',
        getShareActions: () => [],
      });
      expect(() =>
        setup.register({
          id: 'myTest',
          getShareActions: () => [],
        })
      ).toThrowErrorMatchingInlineSnapshot();
    });
  });

  describe('start', () => {
    describe('getActions', () => {
      test('returns a flat list of actions returned by all providers', () => {
        const service = new ShareActionsRegistry();
        const registerFunction = service.setup().register;
        const shareAction1 = {} as ShareAction;
        const shareAction2 = {} as ShareAction;
        const shareAction3 = {} as ShareAction;
        const provider1Callback = jest.fn(() => [shareAction1]);
        const provider2Callback = jest.fn(() => [shareAction2, shareAction3]);
        registerFunction({
          id: 'myTest',
          getShareActions: provider1Callback,
        });
        registerFunction({
          id: 'myTest2',
          getShareActions: provider2Callback,
        });
        const actionProps = {} as ShareActionProps;
        expect(service.start().getActions(actionProps)).toEqual([
          shareAction1,
          shareAction2,
          shareAction3,
        ]);
        expect(provider1Callback).toHaveBeenCalledWith(actionProps);
        expect(provider2Callback).toHaveBeenCalledWith(actionProps);
      });
    });
  });
});
