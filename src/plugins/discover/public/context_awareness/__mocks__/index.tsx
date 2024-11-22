/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
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
import { ProfileProviderServices } from '../profile_providers/profile_provider_services';
import { ProfilesManager } from '../profiles_manager';
import { DiscoverEBTManager } from '../../services/discover_ebt_manager';
import { createLogsContextServiceMock } from '@kbn/discover-utils/src/__mocks__';

export const createContextAwarenessMocks = ({
  shouldRegisterProviders = true,
}: { shouldRegisterProviders?: boolean } = {}) => {
  const rootProfileProviderMock: RootProfileProvider = {
    profileId: 'root-profile',
    profile: {
      getCellRenderers: jest.fn((prev) => (params) => ({
        ...prev(params),
        rootProfile: () => <>root-profile</>,
      })),
      getAdditionalCellActions: jest.fn((prev) => () => [
        ...prev(),
        {
          id: 'root-action',
          getDisplayName: () => 'Root action',
          getIconType: () => 'minus',
          isCompatible: () => false,
          execute: () => {
            alert('Root action executed');
          },
        },
      ]),
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
      getCellRenderers: jest.fn((prev) => (params) => ({
        ...prev(params),
        rootProfile: () => <>data-source-profile</>,
      })),
      getDefaultAppState: jest.fn(() => () => ({
        columns: [
          {
            name: 'message',
            width: 100,
          },
          {
            name: 'extension',
            width: 200,
          },
          {
            name: 'foo',
            width: 300,
          },
          {
            name: 'bar',
            width: 400,
          },
        ],
        rowHeight: 3,
        breakdownField: 'extension',
      })),
      getAdditionalCellActions: jest.fn((prev) => () => [
        ...prev(),
        {
          id: 'data-source-action',
          getDisplayName: () => 'Data source action',
          getIconType: () => 'plus',
          execute: () => {
            alert('Data source action executed');
          },
        },
      ]),
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

  const ebtManagerMock = new DiscoverEBTManager();
  const profilesManagerMock = new ProfilesManager(
    rootProfileServiceMock,
    dataSourceProfileServiceMock,
    documentProfileServiceMock,
    ebtManagerMock
  );

  const profileProviderServices = createProfileProviderServicesMock();

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
    ebtManagerMock,
  };
};

const createProfileProviderServicesMock = () => {
  return {
    logsContextService: createLogsContextServiceMock(),
  } as ProfileProviderServices;
};
