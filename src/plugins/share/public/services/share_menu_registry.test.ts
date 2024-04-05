/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ShareMenuRegistry } from './share_menu_registry';
import { ShareMenuItem, ShareContext } from '../types';

describe('ShareActionsRegistry', () => {
  describe('setup', () => {
    test('throws when registering duplicate id', () => {
      const setup = new ShareMenuRegistry(false).setup();
      setup.register({
        id: 'csvReports',
        getShareMenuItems: () => [],
      });
      expect(() =>
        setup.register({
          id: 'csvReports',
          getShareMenuItems: () => [],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Share menu provider with id [csvReports] has already been registered. Use a unique id."`
      );
    });
  });

  describe('start', () => {
    describe('getActions', () => {
      test('returns a flat list of actions returned by all providers', () => {
        const service = new ShareMenuRegistry(false);
        const registerFunction = service.setup().register;
        const shareAction1 = {} as ShareMenuItem;
        const shareAction2 = {} as ShareMenuItem;
        const shareAction3 = {} as ShareMenuItem;
        const provider1Callback = jest.fn(() => [shareAction1]);
        const provider2Callback = jest.fn(() => [shareAction2, shareAction3]);
        registerFunction({
          id: 'csvReports',
          getShareMenuItems: provider1Callback,
        });
        registerFunction({
          id: 'screenCaptureReports',
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
