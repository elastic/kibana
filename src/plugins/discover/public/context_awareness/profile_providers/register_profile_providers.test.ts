/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createEsqlDataSource } from '../../../common/data_sources';
import { createContextAwarenessMocks } from '../__mocks__';
import { createExampleRootProfileProvider } from './example/example_root_pofile';
import { createExampleDataSourceProfileProvider } from './example/example_data_source_profile/profile';
import { createExampleDocumentProfileProvider } from './example/example_document_profile';

import {
  registerProfileProviders,
  registerEnabledProfileProviders,
} from './register_profile_providers';

const exampleRootProfileProvider = createExampleRootProfileProvider();
const exampleDataSourceProfileProvider = createExampleDataSourceProfileProvider();
const exampleDocumentProfileProvider = createExampleDocumentProfileProvider();

describe('registerEnabledProfileProviders', () => {
  it('should register all profile providers', async () => {
    const { rootProfileServiceMock, rootProfileProviderMock } = createContextAwarenessMocks({
      shouldRegisterProviders: false,
    });
    registerEnabledProfileProviders({
      profileService: rootProfileServiceMock,
      providers: [rootProfileProviderMock],
      enabledExperimentalProfileIds: [],
    });
    const context = await rootProfileServiceMock.resolve({ solutionNavId: null });
    expect(rootProfileServiceMock.getProfile(context)).toBe(rootProfileProviderMock.profile);
  });

  it('should not register experimental profile providers by default', async () => {
    const { rootProfileServiceMock } = createContextAwarenessMocks({
      shouldRegisterProviders: false,
    });

    registerEnabledProfileProviders({
      profileService: rootProfileServiceMock,
      providers: [exampleRootProfileProvider],
      enabledExperimentalProfileIds: [],
    });
    const context = await rootProfileServiceMock.resolve({ solutionNavId: null });
    expect(rootProfileServiceMock.getProfile(context)).not.toBe(exampleRootProfileProvider.profile);
    expect(rootProfileServiceMock.getProfile(context)).toMatchObject({});
  });

  it('should register experimental profile providers when enabled by config', async () => {
    const { rootProfileServiceMock, rootProfileProviderMock } = createContextAwarenessMocks({
      shouldRegisterProviders: false,
    });

    registerEnabledProfileProviders({
      profileService: rootProfileServiceMock,
      providers: [exampleRootProfileProvider],
      enabledExperimentalProfileIds: [exampleRootProfileProvider.profileId],
    });
    const context = await rootProfileServiceMock.resolve({ solutionNavId: null });
    expect(rootProfileServiceMock.getProfile(context)).toBe(exampleRootProfileProvider.profile);
    expect(rootProfileServiceMock.getProfile(context)).not.toBe(rootProfileProviderMock.profile);
  });
});

describe('registerProfileProviders', () => {
  it('should register enabled experimental profile providers', async () => {
    const {
      rootProfileServiceMock,
      dataSourceProfileServiceMock,
      documentProfileServiceMock,
      profileProviderServices,
    } = createContextAwarenessMocks({
      shouldRegisterProviders: false,
    });
    await registerProfileProviders({
      rootProfileService: rootProfileServiceMock,
      dataSourceProfileService: dataSourceProfileServiceMock,
      documentProfileService: documentProfileServiceMock,
      enabledExperimentalProfileIds: [
        exampleRootProfileProvider.profileId,
        exampleDataSourceProfileProvider.profileId,
        exampleDocumentProfileProvider.profileId,
      ],
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
    const {
      rootProfileServiceMock,
      dataSourceProfileServiceMock,
      documentProfileServiceMock,
      profileProviderServices,
    } = createContextAwarenessMocks({
      shouldRegisterProviders: false,
    });
    await registerProfileProviders({
      rootProfileService: rootProfileServiceMock,
      dataSourceProfileService: dataSourceProfileServiceMock,
      documentProfileService: documentProfileServiceMock,
      enabledExperimentalProfileIds: [],
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
});
