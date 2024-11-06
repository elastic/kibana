/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ComponentType } from 'react';
import { from } from 'rxjs';
import { ContentEditorProvider } from '@kbn/content-management-content-editor';
import { UserProfilesProvider, UserProfilesServices } from '@kbn/content-management-user-profiles';

import { TagList } from '../mocks';
import { TableListViewProvider, Services } from '../services';

export const getMockServices = (overrides?: Partial<Services & UserProfilesServices>) => {
  const services: Services & UserProfilesServices = {
    canEditAdvancedSettings: true,
    getListingLimitSettingsUrl: () => 'http://elastic.co',
    notifyError: () => undefined,
    currentAppId$: from('mockedApp'),
    navigateToUrl: () => undefined,
    TagList,
    getTagList: () => [],
    itemHasTags: () => true,
    getTagManagementUrl: () => '',
    getTagIdsFromReferences: () => [],
    isTaggingEnabled: () => true,
    isFavoritesEnabled: () => false,
    bulkGetUserProfiles: async () => [],
    getUserProfile: async () => ({ uid: '', enabled: true, data: {}, user: { username: '' } }),
    ...overrides,
  };

  return services;
};

export function WithServices<P>(
  Comp: ComponentType<P>,
  overrides: Partial<Services & UserProfilesServices> = {}
) {
  return (props: P) => {
    const services = getMockServices(overrides);
    return (
      <UserProfilesProvider {...services}>
        <ContentEditorProvider openFlyout={jest.fn()} notifyError={() => undefined}>
          <TableListViewProvider {...services}>
            <Comp {...(props as any)} />
          </TableListViewProvider>
        </ContentEditorProvider>
      </UserProfilesProvider>
    );
  };
}
