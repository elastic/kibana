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
import type { Request as InspectedRequest } from '@kbn/inspector-plugin/public';
import { RequestStatus } from '@kbn/inspector-plugin/public';
import * as queryAnalysisUtils from './query_analysis_utils';
import { NON_ECS_FIELD } from './scoped_discover_ebt_manager';

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
              description:
                "Field name if it is part of ECS schema. For non ECS compliant fields, there's a <non-ecs> placeholder",
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

      expect(coreSetupMock.analytics.registerEventType).toHaveBeenCalledWith({
        eventType: 'discover_query_fields_usage',
        schema: {
          eventName: {
            type: 'keyword',
            _meta: {
              description:
                'The name of the event that is tracked in the metrics i.e. kqlQuery, esqlQuery',
            },
          },
          fieldNames: {
            type: 'array',
            items: {
              type: 'keyword',
              _meta: {
                description:
                  "List of field names if they are part of ECS schema. For non ECS compliant fields, there's a <non-ecs> placeholder",
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
        eventName: 'dataTableSelection',
        fieldName: NON_ECS_FIELD, // non-ECS fields would be tracked with a "<non-ecs>" label
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
        eventName: 'dataTableRemoval',
        fieldName: NON_ECS_FIELD, // non-ECS fields would be tracked with a "<non-ecs>" label
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
        eventName: 'filterAddition',
        fieldName: NON_ECS_FIELD, // non-ECS fields would be tracked with a "<non-ecs>" label
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

  describe('trackSubmittingQuery', () => {
    it('should track ES|QL query field usage', async () => {
      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });

      const scopedManager = discoverEBTContextManager.createScopedEBTManager();
      scopedManager.setAsActiveManager();

      const esqlQuery = {
        esql: 'FROM logs-synth-default | WHERE test == "test value"',
      };

      await scopedManager.trackSubmittingQuery({
        query: esqlQuery,
        fieldsMetadata,
      });

      expect(coreSetupMock.analytics.reportEvent).toHaveBeenCalledWith(
        'discover_query_fields_usage',
        {
          eventName: 'esqlQuery',
          fieldNames: ['test'],
        }
      );
    });

    it('should track KQL query field usage', async () => {
      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });

      const scopedManager = discoverEBTContextManager.createScopedEBTManager();
      scopedManager.setAsActiveManager();

      const kqlQuery = {
        query: 'test: "test value"',
        language: 'kuery',
      };

      await scopedManager.trackSubmittingQuery({
        query: kqlQuery,
        fieldsMetadata,
      });

      expect(coreSetupMock.analytics.reportEvent).toHaveBeenCalledWith(
        'discover_query_fields_usage',
        {
          eventName: 'kqlQuery',
          fieldNames: ['test'],
        }
      );
    });

    it('should track free text search for KQL queries without field names', async () => {
      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });

      const scopedManager = discoverEBTContextManager.createScopedEBTManager();
      scopedManager.setAsActiveManager();

      const freeTextQuery = {
        query: 'error occurred',
        language: 'kuery',
      };

      await scopedManager.trackSubmittingQuery({
        query: freeTextQuery,
        fieldsMetadata,
      });

      expect(coreSetupMock.analytics.reportEvent).toHaveBeenCalledWith(
        'discover_query_fields_usage',
        {
          eventName: 'kqlQuery',
          fieldNames: ['__FREE_TEXT__'],
        }
      );
    });

    it('should track both free text and field names for KQL queries', async () => {
      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });

      const scopedManager = discoverEBTContextManager.createScopedEBTManager();
      scopedManager.setAsActiveManager();

      const freeTextQuery = {
        query: 'test: "test value" and error occurred',
        language: 'kuery',
      };

      await scopedManager.trackSubmittingQuery({
        query: freeTextQuery,
        fieldsMetadata,
      });

      expect(coreSetupMock.analytics.reportEvent).toHaveBeenCalledWith(
        'discover_query_fields_usage',
        {
          eventName: 'kqlQuery',
          fieldNames: ['test', '__FREE_TEXT__'],
        }
      );
    });

    it('should not track when query is undefined', async () => {
      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });

      const scopedManager = discoverEBTContextManager.createScopedEBTManager();
      scopedManager.setAsActiveManager();

      await scopedManager.trackSubmittingQuery({
        query: undefined,
        fieldsMetadata,
      });

      expect(coreSetupMock.analytics.reportEvent).not.toHaveBeenCalled();
    });

    it('should not track empty ES|QL queries', async () => {
      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });

      const scopedManager = discoverEBTContextManager.createScopedEBTManager();
      scopedManager.setAsActiveManager();

      const emptyEsqlQuery = {
        esql: '',
      };

      await scopedManager.trackSubmittingQuery({
        query: emptyEsqlQuery,
        fieldsMetadata,
      });

      expect(coreSetupMock.analytics.reportEvent).not.toHaveBeenCalled();
    });

    it('should not track empty string queries', async () => {
      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });

      const scopedManager = discoverEBTContextManager.createScopedEBTManager();
      scopedManager.setAsActiveManager();

      const emptyQuery = {
        query: '',
        language: 'kuery' as const,
      };

      await scopedManager.trackSubmittingQuery({
        query: emptyQuery,
        fieldsMetadata,
      });

      expect(coreSetupMock.analytics.reportEvent).not.toHaveBeenCalled();
    });

    it('should track non-ECS compliant fields with <non-ecs> placeholder instead of a field name', async () => {
      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });

      const scopedManager = discoverEBTContextManager.createScopedEBTManager();
      scopedManager.setAsActiveManager();

      const kqlQuery = {
        query: 'test: "test value" AND test2: "test2 value"',
        language: 'kuery',
      };

      await scopedManager.trackSubmittingQuery({
        query: kqlQuery,
        fieldsMetadata,
      });

      expect(coreSetupMock.analytics.reportEvent).toHaveBeenCalledWith(
        'discover_query_fields_usage',
        {
          eventName: 'kqlQuery',
          fieldNames: ['test', NON_ECS_FIELD],
        }
      );

      const esqlQuery = {
        esql: 'FROM logs-synth-default | WHERE test2 == "test2 value"',
      };

      await scopedManager.trackSubmittingQuery({
        query: esqlQuery,
        fieldsMetadata,
      });

      expect(coreSetupMock.analytics.reportEvent).toHaveBeenCalledWith(
        'discover_query_fields_usage',
        {
          eventName: 'esqlQuery',
          fieldNames: [NON_ECS_FIELD],
        }
      );
    });

    it('should deduplicate fields used more than once', async () => {
      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });

      const scopedManager = discoverEBTContextManager.createScopedEBTManager();
      scopedManager.setAsActiveManager();

      const esqlQuery = {
        esql: 'FROM logs-synth-default | WHERE test == "test value" AND test !== "another test value"',
      };

      await scopedManager.trackSubmittingQuery({
        query: esqlQuery,
        fieldsMetadata,
      });

      expect(coreSetupMock.analytics.reportEvent).toHaveBeenCalledWith(
        'discover_query_fields_usage',
        {
          eventName: 'esqlQuery',
          fieldNames: ['test'],
        }
      );
    });

    it('should extract KQL queries embedded in ES|QL query', async () => {
      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });

      const scopedManager = discoverEBTContextManager.createScopedEBTManager();
      scopedManager.setAsActiveManager();

      const esqlQuery = {
        esql: 'FROM logs-synth-default | WHERE KQL("""test:"test-value" """)',
      };

      await scopedManager.trackSubmittingQuery({
        query: esqlQuery,
        fieldsMetadata,
      });

      expect(coreSetupMock.analytics.reportEvent).toHaveBeenCalledWith(
        'discover_query_fields_usage',
        {
          eventName: 'esqlQuery',
          fieldNames: ['test'],
        }
      );
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

  describe('trackQueryPerformanceEvent', () => {
    it('should track query performance events', () => {
      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });

      const scopedManager = discoverEBTContextManager.createScopedEBTManager();
      scopedManager.setAsActiveManager();

      jest.spyOn(window.performance, 'now').mockReturnValueOnce(250).mockReturnValueOnce(1000);

      const tracker = scopedManager.trackQueryPerformanceEvent('testQueryEvent');

      const requests: InspectedRequest[] = [
        {
          id: '0',
          name: 'request 0',
          startTime: 0,
          status: RequestStatus.OK,
          json: {
            query: {
              bool: {
                must: [{ match_phrase: { message: 'foo bar' } }],
              },
            },
          },
        },
        {
          id: '1',
          name: 'request 1',
          startTime: 0,
          status: RequestStatus.OK,
          json: {
            query: {
              multi_match: {
                query: 'test',
                type: 'phrase',
              },
            },
          },
        },
      ];

      tracker.reportEvent(
        {
          queryRangeSeconds: 300,
          requests,
        },
        {
          meta: { foo: 'bar' },
        }
      );

      expect(reportPerformanceMetricEvent).toHaveBeenCalledWith(coreSetupMock.analytics, {
        eventName: 'testQueryEvent',
        duration: 750,
        key1: 'query_range_secs',
        value1: 300,
        key2: 'phrase_query_count',
        value2: 2, // 1 match_phrase + 1 multi_match type=phrase
        meta: {
          foo: 'bar',
          multi_match_types: ['match_phrase', 'phrase'],
        },
      });
    });

    it('should avoid re-analyzing the same request multiple times', () => {
      discoverEBTContextManager.initialize({
        core: coreSetupMock,
        discoverEbtContext$,
      });

      const scopedManager = discoverEBTContextManager.createScopedEBTManager();
      scopedManager.setAsActiveManager();

      const analyzeSpy = jest.spyOn(queryAnalysisUtils, 'analyzeMultiMatchTypesRequest');

      const request: InspectedRequest = {
        id: '0',
        name: 'test request',
        startTime: 0,
        status: RequestStatus.OK,
        json: {
          query: {
            bool: {
              must: [{ match_phrase: { message: 'foo bar' } }],
            },
          },
        },
      };

      const tracker1 = scopedManager.trackQueryPerformanceEvent('testQueryEvent1');
      tracker1.reportEvent({
        queryRangeSeconds: 300,
        requests: [request],
      });

      const tracker2 = scopedManager.trackQueryPerformanceEvent('testQueryEvent2');
      tracker2.reportEvent({
        queryRangeSeconds: 300,
        requests: [request],
      });

      expect(analyzeSpy).toHaveBeenCalledTimes(1);

      analyzeSpy.mockRestore();
    });
  });
});
