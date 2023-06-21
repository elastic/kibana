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

interface Params {
  hasESData: boolean;
  hasUserDataView: boolean;
  showPlainSpinner: boolean;
}

const defaultParams = {
  hasESData: true,
  hasUserDataView: true,
  showPlainSpinner: false,
};

/**
 * Returns the Jest-compatible service abstractions for the `KibanaNoDataPage` Provider.
 */
export const getServicesMock = (params?: Partial<Params>) => {
  const hasESData =
    params && params.hasESData !== undefined ? params.hasESData : defaultParams.hasESData;

  const hasUserDataView =
    params && params.hasUserDataView !== undefined
      ? params.hasUserDataView
      : defaultParams.hasUserDataView;

  const services: KibanaNoDataPageServices = {
    ...getNoDataCardServicesMock(),
    ...getNoDataViewsPromptServicesMock(),
    hasESData: async () => hasESData,
    hasUserDataView: async () => hasUserDataView,
  };

  return services;
};
