/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ShareRegistry } from './share_menu_registry';
import { ShareContext, ShareIntegration, ShareRegistryApiStart } from '../types';
import { url } from '../mocks';

describe('ShareActionsRegistry', () => {
  const startDeps: ShareRegistryApiStart = {
    urlService: url,
    anonymousAccessServiceProvider: () => ({
      getCapabilities: jest.fn(),
      getState: jest.fn(),
    }),
    capabilities: { navLinks: {}, management: {}, catalogue: {} },
    getLicense: jest.fn(),
  };

  describe('registerShareIntegration', () => {
    test('throws when registering duplicate id', () => {
      const shareRegistrySetup = new ShareRegistry().setup();

      shareRegistrySetup.registerShareIntegration({
        id: 'csvReports',
        config: () => ({}),
      });

      expect(() =>
        shareRegistrySetup.registerShareIntegration({
          id: 'csvReports',
          config: () => ({}),
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Share action with type [integration] for app [*] has already been registered."`
      );
    });
  });

  describe('start', () => {
    describe('availableIntegrations', () => {
      it('returns by default the registered integrations without a prerequisite check', () => {
        const shareRegistry = new ShareRegistry();

        const { registerShareIntegration } = shareRegistry.setup();
        const { availableIntegrations } = shareRegistry.start(startDeps);

        // register a global integration without a prerequisite
        registerShareIntegration({
          id: 'csvReports',
          config: () => ({}),
        });

        // we expect to have 2 default share actions (link and embed) + 1 registered integration
        expect(availableIntegrations('someRandomObjectType')).toHaveLength(2 + 1);
      });

      it('omits a registered integration that defines a prerequisite check which returns false', () => {
        const shareRegistry = new ShareRegistry();

        const { registerShareIntegration } = shareRegistry.setup();
        const { availableIntegrations } = shareRegistry.start(startDeps);

        const prerequisiteCheckFn = jest.fn(() => false);

        // register a global integration with a prerequisiteCheck
        registerShareIntegration({
          id: 'csvReports',
          config: () => ({}),
          prerequisiteCheck: prerequisiteCheckFn,
        });

        // we expect to have just the 2 default share actions (link and embed)
        expect(availableIntegrations('someRandomObjectType')).toHaveLength(2);
        expect(prerequisiteCheckFn).toHaveBeenCalledWith(
          expect.objectContaining({
            capabilities: startDeps.capabilities,
            license: startDeps.getLicense(),
            objectType: 'someRandomObjectType',
          })
        );
      });

      it('will include a registered integration that defines a prerequisite check which returns true', () => {
        const shareRegistry = new ShareRegistry();

        const { registerShareIntegration } = shareRegistry.setup();
        const { availableIntegrations } = shareRegistry.start(startDeps);

        const prerequisiteCheckFn = jest.fn(() => true);

        // register a global integration with a prerequisiteCheck
        registerShareIntegration({
          id: 'csvReports',
          config: () => ({}),
          prerequisiteCheck: prerequisiteCheckFn,
        });

        // we expect to have 2 default share actions (link and embed) + 1 registered integration with a passing prerequisite
        expect(availableIntegrations('anotherRandomObjectType')).toHaveLength(2 + 1);
        expect(prerequisiteCheckFn).toHaveBeenCalledWith(
          expect.objectContaining({
            capabilities: startDeps.capabilities,
            license: startDeps.getLicense(),
            objectType: 'anotherRandomObjectType',
          })
        );
      });

      it('will return only the registered integrations that match the requested integration groupId', () => {
        const shareRegistry = new ShareRegistry();

        const { registerShareIntegration } = shareRegistry.setup();
        const { availableIntegrations } = shareRegistry.start(startDeps);

        // register a global integration with a groupId
        registerShareIntegration({
          id: 'csvReports',
          groupId: 'export',
          config: () => ({}),
        });

        // we only expect to have the global integration we registered with the groupId 'export'
        expect(availableIntegrations('someRandomObjectType', 'export')).toHaveLength(1);
      });

      it('will return only the registered integrations that match the requested integration groupId and objectType', () => {
        const shareRegistry = new ShareRegistry();

        const { registerShareIntegration } = shareRegistry.setup();
        const { availableIntegrations } = shareRegistry.start(startDeps);

        // register a scoped integration with a groupId
        registerShareIntegration('scoped', {
          id: 'csvReports',
          groupId: 'export',
          config: () => ({}),
        });

        expect(availableIntegrations('scoped', 'export')).toHaveLength(1);
        expect(availableIntegrations('someRandomObjectType', 'export')).toHaveLength(0);
      });
    });

    describe('resolveShareItemsForShareContext', () => {
      test('it returns the default share actions for any requested app scope without performing any prior registrations', () => {
        const { resolveShareItemsForShareContext } = new ShareRegistry().start(startDeps);

        const context = {
          objectType: 'someRandomObjectType',
        } as ShareContext;

        expect(resolveShareItemsForShareContext({ ...context, isServerless: false })).toEqual([
          expect.objectContaining({
            shareType: 'link',
          }),
          expect.objectContaining({
            shareType: 'embed',
          }),
        ]);
      });

      test('it excludes the default embed share actions for any requested app scope in serverless', () => {
        const { resolveShareItemsForShareContext } = new ShareRegistry().start(startDeps);

        const context = {
          objectType: 'someRandomObjectType',
        } as ShareContext;

        expect(resolveShareItemsForShareContext({ ...context, isServerless: true })).toEqual(
          expect.not.arrayContaining([
            expect.objectContaining({
              shareType: 'embed',
            }),
          ])
        );
      });

      test('returns a flat list of actions returned by all providers', () => {
        const service = new ShareRegistry();
        const { registerShareIntegration: registerFunction } = service.setup();

        const shareAction1ConfigFactory = jest.fn(() => ({}));
        const shareAction1: ShareIntegration = {
          id: 'shareAction1',
          shareType: 'integration',
          config: shareAction1ConfigFactory,
        };

        const shareAction2ConfigFactory = jest.fn(() => ({}));
        const shareAction2: ShareIntegration = {
          id: 'shareAction2',
          shareType: 'integration',
          config: shareAction2ConfigFactory,
        };

        const shareAction3ConfigFactory = jest.fn(() => ({}));
        const shareAction3: ShareIntegration = {
          id: 'shareAction3',
          shareType: 'integration',
          config: shareAction3ConfigFactory,
        };

        registerFunction(shareAction1);
        registerFunction(shareAction2);
        registerFunction(shareAction3);

        const context = { objectType: 'anotherRandomShareObjectType' } as ShareContext;
        const isServerless = false;

        const { resolveShareItemsForShareContext } = service.start(startDeps);

        expect(resolveShareItemsForShareContext({ ...context, isServerless })).toEqual([
          expect.objectContaining({
            shareType: 'link',
            config: expect.any(Object),
          }),
          expect.objectContaining({
            shareType: 'embed',
            config: expect.any(Object),
          }),
          expect.objectContaining({
            shareType: 'integration',
            id: 'shareAction1',
            config: expect.any(Object),
          }),
          expect.objectContaining({
            shareType: 'integration',
            id: 'shareAction2',
            config: expect.any(Object),
          }),
          expect.objectContaining({
            shareType: 'integration',
            id: 'shareAction3',
            config: expect.any(Object),
          }),
        ]);

        [shareAction1ConfigFactory, shareAction2ConfigFactory, shareAction3ConfigFactory].forEach(
          (factory) => {
            expect(factory).toHaveBeenCalledTimes(1);
            expect(shareAction1ConfigFactory).toHaveBeenCalledWith(
              expect.objectContaining({
                ...context,
                urlService: expect.any(Object),
                anonymousAccessServiceProvider: expect.any(Function),
              })
            );
          }
        );
      });

      test('it returns a flat list of actions registered to the requested scope', () => {
        const service = new ShareRegistry();
        const { registerShareIntegration: registerFunction } = service.setup();
        const context = { objectType: 'randomObjectType' } as ShareContext;

        const isServerless = false;

        const shareAction1ConfigFactory = jest.fn(() => ({}));
        const shareAction1: ShareIntegration = {
          id: 'shareAction1',
          shareType: 'integration',
          config: shareAction1ConfigFactory,
        };

        const shareAction2ConfigFactory = jest.fn(() => ({}));
        const shareAction2: ShareIntegration = {
          id: 'shareAction2',
          shareType: 'integration',
          config: shareAction2ConfigFactory,
        };

        const shareAction3ConfigFactory = jest.fn(() => ({}));
        const shareAction3: ShareIntegration = {
          id: 'shareAction3',
          shareType: 'integration',
          config: shareAction3ConfigFactory,
        };

        registerFunction(context.objectType, shareAction1);
        registerFunction('someOtherRandomObjectType', shareAction2);
        registerFunction(context.objectType, shareAction3);

        const { resolveShareItemsForShareContext } = service.start(startDeps);

        expect(resolveShareItemsForShareContext({ ...context, isServerless })).toEqual([
          expect.objectContaining({
            shareType: 'link',
            config: expect.any(Object),
          }),
          expect.objectContaining({
            shareType: 'embed',
            config: expect.any(Object),
          }),
          expect.objectContaining({
            shareType: 'integration',
            id: 'shareAction1',
            config: expect.any(Object),
          }),
          expect.objectContaining({
            shareType: 'integration',
            id: 'shareAction3',
            config: expect.any(Object),
          }),
        ]);
      });
    });
  });
});
