/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import type { ComponentType } from 'react';
import { from } from 'rxjs';
import { ContentEditorProvider } from '@kbn/content-management-content-editor';

import { TagList } from '../mocks';
import { TableListViewProvider, Services } from '../services';

export const getMockServices = (overrides?: Partial<Services>) => {
  const services: Services = {
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
    ...overrides,
  };

  return services;
};

export function WithServices<P>(Comp: ComponentType<P>, overrides: Partial<Services> = {}) {
  return (props: P) => {
    const services = getMockServices(overrides);
    return (
      <ContentEditorProvider openFlyout={jest.fn()} notifyError={() => undefined}>
        <TableListViewProvider {...services}>
          <Comp {...(props as any)} />
        </TableListViewProvider>
      </ContentEditorProvider>
    );
  };
}
