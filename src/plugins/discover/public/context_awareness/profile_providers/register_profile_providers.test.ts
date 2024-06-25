/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createEsqlDataSource } from '../../../common/data_sources';
import { createContextAwarenessMocks } from '../__mocks__';
import { exampleDataSourceProfileProvider } from './example_data_source_profile';
import { exampleDocumentProfileProvider } from './example_document_profile';
import { exampleRootProfileProvider } from './example_root_pofile';
import {
  registerEnabledProfileProviders,
  registerProfileProviders,
} from './register_profile_providers';

describe('registerEnabledProfileProviders', () => {
  it('should register enabled profile providers', async () => {
    const { rootProfileServiceMock, rootProfileProviderMock } = createContextAwarenessMocks({
      shouldRegisterProviders: false,
    });
    registerEnabledProfileProviders({
      profileService: rootProfileServiceMock,
      availableProviders: [rootProfileProviderMock],
      enabledProfileIds: ['root-profile'],
    });
    const context = await rootProfileServiceMock.resolve({ solutionNavId: null });
    expect(rootProfileServiceMock.getProfile(context)).toBe(rootProfileProviderMock.profile);
  });

  it('should not register disabled profile providers', async () => {
    const { rootProfileServiceMock, rootProfileProviderMock } = createContextAwarenessMocks({
      shouldRegisterProviders: false,
    });
    registerEnabledProfileProviders({
      profileService: rootProfileServiceMock,
      availableProviders: [rootProfileProviderMock],
      enabledProfileIds: [],
    });
    const context = await rootProfileServiceMock.resolve({ solutionNavId: null });
    expect(rootProfileServiceMock.getProfile(context)).not.toBe(rootProfileProviderMock.profile);
  });
});

describe('registerProfileProviders', () => {
  it('should register enabled experimental profile providers', async () => {
    const { rootProfileServiceMock, dataSourceProfileServiceMock, documentProfileServiceMock } =
      createContextAwarenessMocks({
        shouldRegisterProviders: false,
      });
    registerProfileProviders({
      rootProfileService: rootProfileServiceMock,
      dataSourceProfileService: dataSourceProfileServiceMock,
      documentProfileService: documentProfileServiceMock,
      experimentalProfileIds: [
        exampleRootProfileProvider.profileId,
        exampleDataSourceProfileProvider.profileId,
        exampleDocumentProfileProvider.profileId,
      ],
    });
    const rootContext = await rootProfileServiceMock.resolve({ solutionNavId: null });
    const dataSourceContext = await dataSourceProfileServiceMock.resolve({
      dataSource: createEsqlDataSource(),
      query: { esql: 'from my-example-logs' },
    });
    const documentContext = documentProfileServiceMock.resolve({
      record: {
        id: 'test',
        flattened: { 'data_stream.type': 'logs' },
        raw: {},
      },
    });
    expect(rootProfileServiceMock.getProfile(rootContext)).toBe(exampleRootProfileProvider.profile);
    expect(dataSourceProfileServiceMock.getProfile(dataSourceContext)).toBe(
      exampleDataSourceProfileProvider.profile
    );
    expect(documentProfileServiceMock.getProfile(documentContext)).toBe(
      exampleDocumentProfileProvider.profile
    );
  });

  it('should not register disabled experimental profile providers', async () => {
    const { rootProfileServiceMock, dataSourceProfileServiceMock, documentProfileServiceMock } =
      createContextAwarenessMocks({
        shouldRegisterProviders: false,
      });
    registerProfileProviders({
      rootProfileService: rootProfileServiceMock,
      dataSourceProfileService: dataSourceProfileServiceMock,
      documentProfileService: documentProfileServiceMock,
      experimentalProfileIds: [],
    });
    const rootContext = await rootProfileServiceMock.resolve({ solutionNavId: null });
    const dataSourceContext = await dataSourceProfileServiceMock.resolve({
      dataSource: createEsqlDataSource(),
      query: { esql: 'from my-example-logs' },
    });
    const documentContext = documentProfileServiceMock.resolve({
      record: {
        id: 'test',
        flattened: { 'data_stream.type': 'logs' },
        raw: {},
      },
    });
    expect(rootProfileServiceMock.getProfile(rootContext)).not.toBe(
      exampleRootProfileProvider.profile
    );
    expect(dataSourceProfileServiceMock.getProfile(dataSourceContext)).not.toBe(
      exampleDataSourceProfileProvider.profile
    );
    expect(documentProfileServiceMock.getProfile(documentContext)).not.toBe(
      exampleDocumentProfileProvider.profile
    );
  });
});
