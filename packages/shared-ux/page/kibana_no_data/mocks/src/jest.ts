/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getNoDataCardServicesMock } from '@kbn/shared-ux-card-no-data-mocks';
import { KibanaNoDataPageServices } from '@kbn/shared-ux-page-kibana-no-data-types';
import { getNoDataViewsPromptServicesMock } from '@kbn/shared-ux-prompt-no-data-views-mocks';
import { mockServicesFactory, MockServicesFactoryParams } from '@kbn/shared-ux-services';

/**
 * Returns the Jest-compatible service abstractions for the `KibanaNoDataPage` Provider.
 */
export const getServicesMock = (params?: MockServicesFactoryParams) => {
  const { canCreateNewDataView, dataViewsDocLink, openDataViewEditor } =
    getNoDataViewsPromptServicesMock();

  const { addBasePath, canAccessFleet } = getNoDataCardServicesMock();

  const { application, data, docLinks, editors, http, permissions, platform } =
    mockServicesFactory(params);

  const services: KibanaNoDataPageServices = {
    ...application,
    ...data,
    ...docLinks,
    ...editors,
    ...http,
    ...permissions,
    ...platform,
    canCreateNewDataView,
    dataViewsDocLink,
    openDataViewEditor,
    addBasePath,
    canAccessFleet,
  };

  return services;
};
