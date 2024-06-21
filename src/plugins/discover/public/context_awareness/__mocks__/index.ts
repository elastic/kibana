/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getDataTableRecords } from '../../__fixtures__/real_hits';
import { dataViewWithTimefieldMock } from '../../__mocks__/data_view_with_timefield';
import {
  DataSourceCategory,
  DataSourceProfileProvider,
  DataSourceProfileService,
  DocumentProfileProvider,
  DocumentProfileService,
  DocumentType,
  RootProfileProvider,
  RootProfileService,
  SolutionType,
} from '../profiles';
import { createProfileProviderServices } from '../profile_providers/profile_provider_services';
import { ProfilesManager } from '../profiles_manager';

export const createContextAwarenessMocks = ({
  shouldRegisterProviders = true,
}: { shouldRegisterProviders?: boolean } = {}) => {
  const rootProfileProviderMock: RootProfileProvider = {
    profileId: 'root-profile',
    profile: {
      getCellRenderers: jest.fn((prev) => () => ({
        ...prev(),
        rootProfile: () => 'root-profile',
      })),
    },
    resolve: jest.fn(() => ({
      isMatch: true,
      context: {
        solutionType: SolutionType.Observability,
      },
    })),
  };

  const dataSourceProfileProviderMock: DataSourceProfileProvider = {
    profileId: 'data-source-profile',
    profile: {
      getCellRenderers: jest.fn((prev) => () => ({
        ...prev(),
        rootProfile: () => 'data-source-profile',
      })),
    },
    resolve: jest.fn(() => ({
      isMatch: true,
      context: {
        category: DataSourceCategory.Logs,
      },
    })),
  };

  const documentProfileProviderMock: DocumentProfileProvider = {
    profileId: 'document-profile',
    profile: {
      getCellRenderers: jest.fn((prev) => () => ({
        ...prev(),
        rootProfile: () => 'document-profile',
      })),
      getDocViewer: (prev) => (params) => {
        const recordId = params.record.id;
        const prevValue = prev(params);
        return {
          title: `${prevValue.title ?? 'Document'} #${recordId}`,
          docViewsRegistry: (registry) => {
            registry.add({
              id: 'doc_view_mock',
              title: 'Mock tab',
              order: 10,
              component: () => {
                return null;
              },
            });
            return prevValue.docViewsRegistry(registry);
          },
        };
      },
    } as DocumentProfileProvider['profile'],
    resolve: jest.fn(() => ({
      isMatch: true,
      context: {
        type: DocumentType.Log,
      },
    })),
  };

  const records = getDataTableRecords(dataViewWithTimefieldMock);
  const contextRecordMock = records[0];
  const contextRecordMock2 = records[1];
  const rootProfileServiceMock = new RootProfileService();
  const dataSourceProfileServiceMock = new DataSourceProfileService();
  const documentProfileServiceMock = new DocumentProfileService();

  if (shouldRegisterProviders) {
    rootProfileServiceMock.registerProvider(rootProfileProviderMock);
    dataSourceProfileServiceMock.registerProvider(dataSourceProfileProviderMock);
    documentProfileServiceMock.registerProvider(documentProfileProviderMock);
  }

  const profilesManagerMock = new ProfilesManager(
    rootProfileServiceMock,
    dataSourceProfileServiceMock,
    documentProfileServiceMock
  );

  const profileProviderServices = createProfileProviderServices();

  return {
    rootProfileProviderMock,
    dataSourceProfileProviderMock,
    documentProfileProviderMock,
    rootProfileServiceMock,
    dataSourceProfileServiceMock,
    documentProfileServiceMock,
    contextRecordMock,
    contextRecordMock2,
    profilesManagerMock,
    profileProviderServices,
  };
};
