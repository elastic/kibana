/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { NoDataViewsPromptServices } from '@kbn/shared-ux-prompt-no-data-views-types';

const defaultParams = {};

/**
 * Returns the Jest-compatible service abstractions for the `NoDataViewsPrompt` Provider.
 */
export const getNoDataViewsPromptServicesMock = (
  params: Partial<NoDataViewsPromptServices> = defaultParams
) => {
  const { canCreateNewDataView, dataViewsDocLink, esqlDocLink } = params || {};

  const services: NoDataViewsPromptServices = {
    canCreateNewDataView: canCreateNewDataView || true,
    dataViewsDocLink: dataViewsDocLink || 'some/link',
    esqlDocLink: esqlDocLink || 'some/link',
    openDataViewEditor: jest.fn(),
    onTryESQL: jest.fn(),
  };

  return services;
};
