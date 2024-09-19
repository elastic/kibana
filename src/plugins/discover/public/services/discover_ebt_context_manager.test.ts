/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import { DiscoverEBTContextManager } from './discover_ebt_context_manager';

const coreSetupMock = coreMock.createSetup();

describe('DiscoverEBTContextManager', () => {
  let discoverEBTContextManager: DiscoverEBTContextManager;

  beforeEach(() => {
    discoverEBTContextManager = new DiscoverEBTContextManager();
  });

  describe('register', () => {
    it('should register the context provider', () => {
      discoverEBTContextManager.register({ core: coreSetupMock });

      expect(coreSetupMock.analytics.registerContextProvider).toHaveBeenCalledWith({
        name: 'discover_context',
        context$: expect.any(BehaviorSubject),
        schema: {
          dscProfiles: {
            type: 'array',
            items: {
              type: 'keyword',
              _meta: {
                description:
                  'List of profiles which are activated by Discover Context Awareness logic',
              },
            },
          },
        },
      });
    });
  });

  describe('updateProfilesWith', () => {
    it('should update the profiles with the provided props', () => {
      const dscProfiles = ['profile1', 'profile2'];
      const dscProfiles2 = ['profile21', 'profile22'];
      discoverEBTContextManager.register({ core: coreSetupMock });
      discoverEBTContextManager.enable();

      discoverEBTContextManager.updateProfilesContextWith(dscProfiles);
      expect(discoverEBTContextManager.getProfilesContext()).toBe(dscProfiles);

      discoverEBTContextManager.updateProfilesContextWith(dscProfiles2);
      expect(discoverEBTContextManager.getProfilesContext()).toBe(dscProfiles2);
    });

    it('should not update the profiles if profile list did not change', () => {
      const dscProfiles = ['profile1', 'profile2'];
      const dscProfiles2 = ['profile1', 'profile2'];
      discoverEBTContextManager.register({ core: coreSetupMock });
      discoverEBTContextManager.enable();

      discoverEBTContextManager.updateProfilesContextWith(dscProfiles);
      expect(discoverEBTContextManager.getProfilesContext()).toBe(dscProfiles);

      discoverEBTContextManager.updateProfilesContextWith(dscProfiles2);
      expect(discoverEBTContextManager.getProfilesContext()).toBe(dscProfiles);
    });

    it('should not update the profiles if not enabled yet', () => {
      const dscProfiles = ['profile1', 'profile2'];
      discoverEBTContextManager.register({ core: coreSetupMock });

      discoverEBTContextManager.updateProfilesContextWith(dscProfiles);
      expect(discoverEBTContextManager.getProfilesContext()).toEqual([]);
    });

    it('should not update the profiles after resetting unless enabled again', () => {
      const dscProfiles = ['profile1', 'profile2'];
      discoverEBTContextManager.register({ core: coreSetupMock });
      discoverEBTContextManager.enable();
      discoverEBTContextManager.updateProfilesContextWith(dscProfiles);
      expect(discoverEBTContextManager.getProfilesContext()).toBe(dscProfiles);
      discoverEBTContextManager.reset();
      expect(discoverEBTContextManager.getProfilesContext()).toEqual([]);
      discoverEBTContextManager.updateProfilesContextWith(dscProfiles);
      expect(discoverEBTContextManager.getProfilesContext()).toEqual([]);
      discoverEBTContextManager.enable();
      discoverEBTContextManager.updateProfilesContextWith(dscProfiles);
      expect(discoverEBTContextManager.getProfilesContext()).toBe(dscProfiles);
    });
  });
});
