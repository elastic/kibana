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
import { ProfilesManager } from '../profiles_manager';

export const createContextAwarenessMocks = () => {
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
  rootProfileServiceMock.registerProvider(rootProfileProviderMock);

  const dataSourceProfileServiceMock = new DataSourceProfileService();
  dataSourceProfileServiceMock.registerProvider(dataSourceProfileProviderMock);

  const documentProfileServiceMock = new DocumentProfileService();
  documentProfileServiceMock.registerProvider(documentProfileProviderMock);

  const profilesManagerMock = new ProfilesManager(
    rootProfileServiceMock,
    dataSourceProfileServiceMock,
    documentProfileServiceMock
  );

  return {
    rootProfileProviderMock,
    dataSourceProfileProviderMock,
    documentProfileProviderMock,
    contextRecordMock,
    contextRecordMock2,
    profilesManagerMock,
  };
};
