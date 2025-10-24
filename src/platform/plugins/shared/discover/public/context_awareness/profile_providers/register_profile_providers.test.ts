/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { uniq } from 'lodash';
import { createEsqlDataSource } from '../../../common/data_sources';
import { createContextAwarenessMocks, createProfileProviderSharedServicesMock } from '../__mocks__';
import { createExampleRootProfileProvider } from './example/example_root_profile';
import { createExampleDataSourceProfileProvider } from './example/example_data_source_profile/profile';
import { createExampleDocumentProfileProvider } from './example/example_document_profile';
import { registerProfileProviders } from './register_profile_providers';
import type { BaseProfileProvider } from '../profile_service';

const levels = ['root', 'data-source', 'document'];
let mockAllCollectedProfiles: Array<{ level: string; profileId: string }> = [];

jest.mock('./register_enabled_profile_providers', () => {
  const real = jest.requireActual('./register_enabled_profile_providers');
  return {
    ...real,
    registerEnabledProfileProviders: jest.fn((params) => {
      let level = 'unknown';
      levels.forEach((l) => {
        if (params.profileService.defaultContext.profileId.includes(l)) {
          level = l;
        }
      });
      mockAllCollectedProfiles.push(
        ...params.providers.map((p: BaseProfileProvider<{}, {}>) => {
          return { level, profileId: p.profileId };
        })
      );
      return real.registerEnabledProfileProviders(params);
    }),
  };
});

const exampleRootProfileProvider = createExampleRootProfileProvider();
const exampleDataSourceProfileProvider = createExampleDataSourceProfileProvider();
const exampleDocumentProfileProvider = createExampleDocumentProfileProvider();

describe('registerProfileProviders', () => {
  beforeEach(() => {
    mockAllCollectedProfiles = [];
  });

  it('should register enabled experimental profile providers', async () => {
    const profileProviderServices = createProfileProviderSharedServicesMock();
    const { rootProfileServiceMock, dataSourceProfileServiceMock, documentProfileServiceMock } =
      createContextAwarenessMocks({
        shouldRegisterProviders: false,
      });
    registerProfileProviders({
      rootProfileService: rootProfileServiceMock,
      dataSourceProfileService: dataSourceProfileServiceMock,
      documentProfileService: documentProfileServiceMock,
      enabledExperimentalProfileIds: [
        exampleRootProfileProvider.profileId,
        exampleDataSourceProfileProvider.profileId,
        exampleDocumentProfileProvider.profileId,
      ],
      sharedServices: profileProviderServices,
      services: profileProviderServices,
    });
    const rootContext = await rootProfileServiceMock.resolve({ solutionNavId: null });
    const dataSourceContext = await dataSourceProfileServiceMock.resolve({
      rootContext,
      dataSource: createEsqlDataSource(),
      query: { esql: 'from my-example-logs' },
    });
    const documentContext = documentProfileServiceMock.resolve({
      rootContext,
      dataSourceContext,
      record: {
        id: 'test',
        flattened: { 'data_stream.type': 'example' },
        raw: {},
      },
    });
    expect(rootContext.profileId).toBe(exampleRootProfileProvider.profileId);
    expect(dataSourceContext.profileId).toBe(exampleDataSourceProfileProvider.profileId);
    expect(documentContext.profileId).toBe(exampleDocumentProfileProvider.profileId);
  });

  it('should not register disabled experimental profile providers', async () => {
    const profileProviderServices = createProfileProviderSharedServicesMock();
    const { rootProfileServiceMock, dataSourceProfileServiceMock, documentProfileServiceMock } =
      createContextAwarenessMocks({
        shouldRegisterProviders: false,
      });
    registerProfileProviders({
      rootProfileService: rootProfileServiceMock,
      dataSourceProfileService: dataSourceProfileServiceMock,
      documentProfileService: documentProfileServiceMock,
      enabledExperimentalProfileIds: [],
      sharedServices: profileProviderServices,
      services: profileProviderServices,
    });
    const rootContext = await rootProfileServiceMock.resolve({ solutionNavId: null });
    const dataSourceContext = await dataSourceProfileServiceMock.resolve({
      rootContext,
      dataSource: createEsqlDataSource(),
      query: { esql: 'from my-example-logs' },
    });
    const documentContext = documentProfileServiceMock.resolve({
      rootContext,
      dataSourceContext,
      record: {
        id: 'test',
        flattened: { 'data_stream.type': 'example' },
        raw: {},
      },
    });
    expect(rootContext.profileId).not.toBe(exampleRootProfileProvider.profileId);
    expect(dataSourceContext.profileId).not.toBe(exampleDataSourceProfileProvider.profileId);
    expect(documentContext.profileId).not.toBe(exampleDocumentProfileProvider.profileId);
  });

  it('all profile ids should be unique', async () => {
    expect(mockAllCollectedProfiles.length).toBe(0);

    const profileProviderServices = createProfileProviderSharedServicesMock();
    const { rootProfileServiceMock, dataSourceProfileServiceMock, documentProfileServiceMock } =
      createContextAwarenessMocks({
        shouldRegisterProviders: false,
      });
    registerProfileProviders({
      rootProfileService: rootProfileServiceMock,
      dataSourceProfileService: dataSourceProfileServiceMock,
      documentProfileService: documentProfileServiceMock,
      enabledExperimentalProfileIds: [],
      sharedServices: profileProviderServices,
      services: profileProviderServices,
    });

    expect(mockAllCollectedProfiles.length).toBeGreaterThan(0);

    const allCollectedProfileIds = mockAllCollectedProfiles.map((p) => p.profileId);
    expect(allCollectedProfileIds).toEqual(uniq(allCollectedProfileIds));
  });

  it('all profile ids should be named appropriate to their context level', async () => {
    expect(mockAllCollectedProfiles.length).toBe(0);

    const profileProviderServices = createProfileProviderSharedServicesMock();
    const { rootProfileServiceMock, dataSourceProfileServiceMock, documentProfileServiceMock } =
      createContextAwarenessMocks({
        shouldRegisterProviders: false,
      });
    registerProfileProviders({
      rootProfileService: rootProfileServiceMock,
      dataSourceProfileService: dataSourceProfileServiceMock,
      documentProfileService: documentProfileServiceMock,
      enabledExperimentalProfileIds: [],
      sharedServices: profileProviderServices,
      services: profileProviderServices,
    });

    expect(mockAllCollectedProfiles.length).toBeGreaterThan(0);

    mockAllCollectedProfiles.forEach((item) => {
      expect(item.profileId.length).toBeGreaterThan(0);
      expect(item.level).not.toBe('unknown');
      if (levels.some((level) => item.profileId.includes(level))) {
        expect(item.profileId).toContain(item.level);
      }
    });
  });
});
