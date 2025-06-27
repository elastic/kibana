/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, skip } from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import { type DiscoverEBTContextProps, DiscoverEBTManager } from '.';
import { registerDiscoverEBTManagerAnalytics } from './discover_ebt_manager_registrations';
import { ContextualProfileLevel } from '../context_awareness/profiles_manager';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';

jest.mock('@kbn/ebt-tools', () => ({
  ...jest.requireActual('@kbn/ebt-tools'),
  reportPerformanceMetricEvent: jest.fn(),
}));

describe('DiscoverEBTManager', () => {
  let discoverEBTContextManager: DiscoverEBTManager;
  let discoverEbtContext$: BehaviorSubject<DiscoverEBTContextProps>;

  const coreSetupMock = coreMock.createSetup();

  const fieldsMetadata = {
    getClient: jest.fn().mockResolvedValue({
      find: jest.fn().mockResolvedValue({
        fields: {
          test: {
            short: 'test',
          },
        },
      }),
    }),
  } as unknown as FieldsMetadataPublicStart;

  beforeEach(() => {
    discoverEBTContextManager = new DiscoverEBTManager();
    discoverEbtContext$ = new BehaviorSubject<DiscoverEBTContextProps>({
      discoverProfiles: [],
    });
    (coreSetupMock.analytics.reportEvent as jest.Mock).mockClear();
    (reportPerformanceMetricEvent as jest.Mock).mockClear();
    jest.spyOn(window.performance, 'now').mockRestore();
  });

  describe('register', () => {
    it('should register the context provider and custom events', () => {
      registerDiscoverEBTManagerAnalytics(coreSetupMock, discoverEbtContext$);

      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });

      expect(coreSetupMock.analytics.registerContextProvider).toHaveBeenCalledWith({
        name: 'discover_context',
        context$: expect.any(BehaviorSubject),
        schema: {
          discoverProfiles: {
            type: 'array',
            items: {
              type: 'keyword',
              _meta: {
                description: 'List of active Discover context awareness profiles',
              },
            },
          },
        },
      });

      expect(coreSetupMock.analytics.registerEventType).toHaveBeenCalledWith({
        eventType: 'discover_field_usage',
        schema: {
          eventName: {
            type: 'keyword',
            _meta: {
              description:
                'The name of the event that is tracked in the metrics i.e. dataTableSelection, dataTableRemoval',
            },
          },
          fieldName: {
            type: 'keyword',
            _meta: {
              description: "Field name if it's a part of ECS schema",
              optional: true,
            },
          },
          filterOperation: {
            type: 'keyword',
            _meta: {
              description: "Operation type when a filter is added i.e. '+', '-', '_exists_'",
              optional: true,
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
      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });
      discoverEBTContextManager.onDiscoverAppMounted();
      const scopedManager = discoverEBTContextManager.createScopedEBTManager();
      scopedManager.setAsActiveManager();

      scopedManager.updateProfilesContextWith(dscProfiles);
      expect(discoverEBTContextManager.getProfilesContext()).toBe(dscProfiles);

      scopedManager.updateProfilesContextWith(dscProfiles2);
      expect(discoverEBTContextManager.getProfilesContext()).toBe(dscProfiles2);
    });

    it('should not update the profiles if profile list did not change', () => {
      const dscProfiles = ['profile1', 'profile2'];
      const dscProfiles2 = ['profile1', 'profile2'];
      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });
      discoverEBTContextManager.onDiscoverAppMounted();
      const scopedManager = discoverEBTContextManager.createScopedEBTManager();
      scopedManager.setAsActiveManager();

      scopedManager.updateProfilesContextWith(dscProfiles);
      expect(discoverEBTContextManager.getProfilesContext()).toBe(dscProfiles);

      scopedManager.updateProfilesContextWith(dscProfiles2);
      expect(discoverEBTContextManager.getProfilesContext()).toBe(dscProfiles);
    });

    it('should not update the profiles if not enabled yet', () => {
      const dscProfiles = ['profile1', 'profile2'];
      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });
      const scopedManager = discoverEBTContextManager.createScopedEBTManager();
      scopedManager.setAsActiveManager();

      scopedManager.updateProfilesContextWith(dscProfiles);
      expect(discoverEBTContextManager.getProfilesContext()).toEqual([]);
    });

    it('should not update the profiles after resetting unless enabled again', () => {
      const dscProfiles = ['profile1', 'profile2'];
      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });
      discoverEBTContextManager.onDiscoverAppMounted();
      const scopedManager = discoverEBTContextManager.createScopedEBTManager();
      scopedManager.setAsActiveManager();
      scopedManager.updateProfilesContextWith(dscProfiles);
      expect(discoverEBTContextManager.getProfilesContext()).toBe(dscProfiles);
      discoverEBTContextManager.onDiscoverAppUnmounted();
      expect(discoverEBTContextManager.getProfilesContext()).toEqual([]);
      scopedManager.updateProfilesContextWith(dscProfiles);
      expect(discoverEBTContextManager.getProfilesContext()).toEqual([]);
      discoverEBTContextManager.onDiscoverAppMounted();
      scopedManager.setAsActiveManager();
      scopedManager.updateProfilesContextWith(dscProfiles);
      expect(discoverEBTContextManager.getProfilesContext()).toBe(dscProfiles);
    });

    it('should not update the profiles if there is no active scoped manager', () => {
      const dscProfiles = ['profile1', 'profile2'];
      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });
      discoverEBTContextManager.onDiscoverAppMounted();
      const scopedManager = discoverEBTContextManager.createScopedEBTManager();
      scopedManager.updateProfilesContextWith(dscProfiles);
      expect(discoverEBTContextManager.getProfilesContext()).toEqual([]);
    });

    it('should update the profiles when activating a scoped manager', () => {
      const dscProfiles = ['profile1', 'profile2'];
      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });
      discoverEBTContextManager.onDiscoverAppMounted();
      const scopedManager = discoverEBTContextManager.createScopedEBTManager();
      scopedManager.updateProfilesContextWith(dscProfiles);
      expect(discoverEBTContextManager.getProfilesContext()).toEqual([]);
      scopedManager.setAsActiveManager();
      expect(discoverEBTContextManager.getProfilesContext()).toBe(dscProfiles);
    });

    it('should update the profiles when changing the active scoped manager', () => {
      const dscProfiles = ['profile1', 'profile2'];
      const dscProfiles2 = ['profile21', 'profile22'];
      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });
      discoverEBTContextManager.onDiscoverAppMounted();
      const scopedManager = discoverEBTContextManager.createScopedEBTManager();
      const anotherScopedManager = discoverEBTContextManager.createScopedEBTManager();
      scopedManager.setAsActiveManager();
      scopedManager.updateProfilesContextWith(dscProfiles);
      anotherScopedManager.updateProfilesContextWith(dscProfiles2);
      expect(discoverEBTContextManager.getProfilesContext()).toBe(dscProfiles);
      anotherScopedManager.setAsActiveManager();
      expect(discoverEBTContextManager.getProfilesContext()).toBe(dscProfiles2);
    });

    it('should not update the profiles for inactive scoped managers', () => {
      const dscProfiles = ['profile1', 'profile2'];
      const dscProfiles2 = ['profile21', 'profile22'];
      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });
      discoverEBTContextManager.onDiscoverAppMounted();
      const scopedManager = discoverEBTContextManager.createScopedEBTManager();
      const anotherScopedManager = discoverEBTContextManager.createScopedEBTManager();
      scopedManager.setAsActiveManager();
      scopedManager.updateProfilesContextWith(dscProfiles);
      expect(discoverEBTContextManager.getProfilesContext()).toBe(dscProfiles);
      anotherScopedManager.setAsActiveManager();
      expect(discoverEBTContextManager.getProfilesContext()).toEqual([]);
      scopedManager.updateProfilesContextWith(dscProfiles2);
      expect(discoverEBTContextManager.getProfilesContext()).toEqual([]);
    });
  });

  describe('onDiscoverAppMounted/onDiscoverAppUnmounted', () => {
    it('should clear the active scoped manager after unmounting and remounting', () => {
      const dscProfiles = ['profile1', 'profile2'];
      const dscProfiles2 = ['profile21', 'profile22'];
      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });
      discoverEBTContextManager.onDiscoverAppMounted();
      const scopedManager = discoverEBTContextManager.createScopedEBTManager();
      scopedManager.setAsActiveManager();
      scopedManager.updateProfilesContextWith(dscProfiles);
      expect(discoverEBTContextManager.getProfilesContext()).toBe(dscProfiles);
      discoverEBTContextManager.onDiscoverAppUnmounted();
      expect(discoverEBTContextManager.getProfilesContext()).toEqual([]);
      discoverEBTContextManager.onDiscoverAppMounted();
      expect(discoverEBTContextManager.getProfilesContext()).toEqual([]);
      scopedManager.updateProfilesContextWith(dscProfiles2);
      expect(discoverEBTContextManager.getProfilesContext()).toEqual([]);
      scopedManager.setAsActiveManager();
      expect(discoverEBTContextManager.getProfilesContext()).toBe(dscProfiles2);
    });
  });

  describe('trackFieldUsageEvent', () => {
    it('should track the field usage when a field is added to the table', async () => {
      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });

      const scopedManager = discoverEBTContextManager.createScopedEBTManager();
      scopedManager.setAsActiveManager();

      await scopedManager.trackDataTableSelection({
        fieldName: 'test',
        fieldsMetadata,
      });

      expect(coreSetupMock.analytics.reportEvent).toHaveBeenCalledWith('discover_field_usage', {
        eventName: 'dataTableSelection',
        fieldName: 'test',
      });

      await scopedManager.trackDataTableSelection({
        fieldName: 'test2',
        fieldsMetadata,
      });

      expect(coreSetupMock.analytics.reportEvent).toHaveBeenLastCalledWith('discover_field_usage', {
        eventName: 'dataTableSelection', // non-ECS fields would not be included in properties
      });
    });

    it('should track the field usage when a field is removed from the table', async () => {
      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });

      const scopedManager = discoverEBTContextManager.createScopedEBTManager();
      scopedManager.setAsActiveManager();

      await scopedManager.trackDataTableRemoval({
        fieldName: 'test',
        fieldsMetadata,
      });

      expect(coreSetupMock.analytics.reportEvent).toHaveBeenCalledWith('discover_field_usage', {
        eventName: 'dataTableRemoval',
        fieldName: 'test',
      });

      await scopedManager.trackDataTableRemoval({
        fieldName: 'test2',
        fieldsMetadata,
      });

      expect(coreSetupMock.analytics.reportEvent).toHaveBeenLastCalledWith('discover_field_usage', {
        eventName: 'dataTableRemoval', // non-ECS fields would not be included in properties
      });
    });

    it('should track the field usage when a filter is created', async () => {
      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });

      const scopedManager = discoverEBTContextManager.createScopedEBTManager();
      scopedManager.setAsActiveManager();

      await scopedManager.trackFilterAddition({
        fieldName: 'test',
        fieldsMetadata,
        filterOperation: '+',
      });

      expect(coreSetupMock.analytics.reportEvent).toHaveBeenCalledWith('discover_field_usage', {
        eventName: 'filterAddition',
        fieldName: 'test',
        filterOperation: '+',
      });

      await scopedManager.trackFilterAddition({
        fieldName: 'test2',
        fieldsMetadata,
        filterOperation: '_exists_',
      });

      expect(coreSetupMock.analytics.reportEvent).toHaveBeenLastCalledWith('discover_field_usage', {
        eventName: 'filterAddition', // non-ECS fields would not be included in properties
        filterOperation: '_exists_',
      });
    });

    it('should temporarily update the discoverEbtContext$ when tracking field usage in an inactive scoped manager', async () => {
      const dscProfiles = ['profile1', 'profile2'];
      const dscProfiles2 = ['profile21', 'profile22'];

      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });
      discoverEBTContextManager.onDiscoverAppMounted();

      const scopedManager = discoverEBTContextManager.createScopedEBTManager();
      const anotherScopedManager = discoverEBTContextManager.createScopedEBTManager();

      scopedManager.setAsActiveManager();
      scopedManager.updateProfilesContextWith(dscProfiles);
      anotherScopedManager.updateProfilesContextWith(dscProfiles2);

      expect(discoverEBTContextManager.getProfilesContext()).toBe(dscProfiles);

      const results: unknown[] = [];

      discoverEbtContext$.pipe(skip(1)).subscribe(({ discoverProfiles }) => {
        results.push(discoverProfiles);
      });

      jest
        .spyOn(coreSetupMock.analytics, 'reportEvent')
        .mockImplementation((eventType, eventData) => {
          results.push({ eventType, eventData });
        });

      await anotherScopedManager.trackDataTableSelection({
        fieldName: 'test',
        fieldsMetadata,
      });
      await anotherScopedManager.trackDataTableRemoval({
        fieldName: 'test',
        fieldsMetadata,
      });
      await anotherScopedManager.trackFilterAddition({
        fieldName: 'test',
        fieldsMetadata,
        filterOperation: '+',
      });

      expect(results).toEqual([
        ['profile21', 'profile22'],
        {
          eventType: 'discover_field_usage',
          eventData: {
            eventName: 'dataTableSelection',
            fieldName: 'test',
          },
        },
        ['profile1', 'profile2'],
        ['profile21', 'profile22'],
        {
          eventType: 'discover_field_usage',
          eventData: {
            eventName: 'dataTableRemoval',
            fieldName: 'test',
          },
        },
        ['profile1', 'profile2'],
        ['profile21', 'profile22'],
        {
          eventType: 'discover_field_usage',
          eventData: {
            eventName: 'filterAddition',
            fieldName: 'test',
            filterOperation: '+',
          },
        },
        ['profile1', 'profile2'],
      ]);
    });
  });

  describe('trackContextualProfileResolvedEvent', () => {
    it('should track the event when a next contextual profile is resolved', async () => {
      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });

      const scopedManager = discoverEBTContextManager.createScopedEBTManager();
      scopedManager.setAsActiveManager();

      scopedManager.trackContextualProfileResolvedEvent({
        contextLevel: ContextualProfileLevel.rootLevel,
        profileId: 'test',
      });

      expect(coreSetupMock.analytics.reportEvent).toHaveBeenNthCalledWith(
        1,
        'discover_profile_resolved',
        {
          contextLevel: 'rootLevel',
          profileId: 'test',
        }
      );

      scopedManager.trackContextualProfileResolvedEvent({
        contextLevel: ContextualProfileLevel.dataSourceLevel,
        profileId: 'data-source-test',
      });

      expect(coreSetupMock.analytics.reportEvent).toHaveBeenNthCalledWith(
        2,
        'discover_profile_resolved',
        {
          contextLevel: 'dataSourceLevel',
          profileId: 'data-source-test',
        }
      );

      scopedManager.trackContextualProfileResolvedEvent({
        contextLevel: ContextualProfileLevel.documentLevel,
        profileId: 'document-test',
      });

      expect(coreSetupMock.analytics.reportEvent).toHaveBeenNthCalledWith(
        3,
        'discover_profile_resolved',
        {
          contextLevel: 'documentLevel',
          profileId: 'document-test',
        }
      );
    });

    it('should not trigger duplicate requests', async () => {
      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });

      const scopedManager = discoverEBTContextManager.createScopedEBTManager();
      scopedManager.setAsActiveManager();

      scopedManager.trackContextualProfileResolvedEvent({
        contextLevel: ContextualProfileLevel.rootLevel,
        profileId: 'test1',
      });

      expect(coreSetupMock.analytics.reportEvent).toHaveBeenCalledTimes(1);

      scopedManager.trackContextualProfileResolvedEvent({
        contextLevel: ContextualProfileLevel.rootLevel,
        profileId: 'test1',
      });

      expect(coreSetupMock.analytics.reportEvent).toHaveBeenCalledTimes(1);

      scopedManager.trackContextualProfileResolvedEvent({
        contextLevel: ContextualProfileLevel.rootLevel,
        profileId: 'test2',
      });

      expect(coreSetupMock.analytics.reportEvent).toHaveBeenCalledTimes(2);
    });

    it('should temporarily update the discoverEbtContext$ when a contextual profile is resolved in an inactive scoped manager', () => {
      const dscProfiles = ['profile1', 'profile2'];
      const dscProfiles2 = ['profile21', 'profile22'];

      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });
      discoverEBTContextManager.onDiscoverAppMounted();

      const scopedManager = discoverEBTContextManager.createScopedEBTManager();
      const anotherScopedManager = discoverEBTContextManager.createScopedEBTManager();

      scopedManager.setAsActiveManager();
      scopedManager.updateProfilesContextWith(dscProfiles);
      anotherScopedManager.updateProfilesContextWith(dscProfiles2);

      expect(discoverEBTContextManager.getProfilesContext()).toBe(dscProfiles);

      const results: unknown[] = [];

      discoverEbtContext$.pipe(skip(1)).subscribe(({ discoverProfiles }) => {
        results.push(discoverProfiles);
      });

      jest
        .spyOn(coreSetupMock.analytics, 'reportEvent')
        .mockImplementation((eventType, eventData) => {
          results.push({ eventType, eventData });
        });

      anotherScopedManager.trackContextualProfileResolvedEvent({
        contextLevel: ContextualProfileLevel.rootLevel,
        profileId: 'test',
      });

      expect(results).toEqual([
        ['profile21', 'profile22'],
        {
          eventType: 'discover_profile_resolved',
          eventData: {
            contextLevel: 'rootLevel',
            profileId: 'test',
          },
        },
        ['profile1', 'profile2'],
      ]);
    });
  });

  describe('trackPerformanceEvent', () => {
    it('should track performance events', () => {
      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });

      const scopedManager = discoverEBTContextManager.createScopedEBTManager();
      scopedManager.setAsActiveManager();

      jest.spyOn(window.performance, 'now').mockReturnValueOnce(250).mockReturnValueOnce(1000);

      const tracker = scopedManager.trackPerformanceEvent('testEvent');
      tracker.reportEvent({ meta: { foo: 'bar' } });

      expect(reportPerformanceMetricEvent).toHaveBeenCalledWith(coreSetupMock.analytics, {
        eventName: 'testEvent',
        duration: 750,
        meta: { foo: 'bar' },
      });
    });

    it('should temporarily update the discoverEbtContext$ when tracking performance events in an inactive scoped manager', () => {
      const dscProfiles = ['profile1', 'profile2'];
      const dscProfiles2 = ['profile21', 'profile22'];

      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });
      discoverEBTContextManager.onDiscoverAppMounted();

      const scopedManager = discoverEBTContextManager.createScopedEBTManager();
      const anotherScopedManager = discoverEBTContextManager.createScopedEBTManager();

      scopedManager.setAsActiveManager();
      scopedManager.updateProfilesContextWith(dscProfiles);
      anotherScopedManager.updateProfilesContextWith(dscProfiles2);

      expect(discoverEBTContextManager.getProfilesContext()).toBe(dscProfiles);

      const results: unknown[] = [];

      discoverEbtContext$.pipe(skip(1)).subscribe(({ discoverProfiles }) => {
        results.push(discoverProfiles);
      });

      (reportPerformanceMetricEvent as jest.Mock).mockImplementation((_, eventData) => {
        results.push(eventData);
      });

      jest.spyOn(window.performance, 'now').mockReturnValueOnce(250).mockReturnValueOnce(1000);

      const tracker = anotherScopedManager.trackPerformanceEvent('testEvent');
      tracker.reportEvent({ meta: { foo: 'bar' } });

      expect(results).toEqual([
        ['profile21', 'profile22'],
        {
          eventName: 'testEvent',
          duration: 750,
          meta: { foo: 'bar' },
        },
        ['profile1', 'profile2'],
      ]);
    });
  });
});
