/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { servicesFactory } from '@kbn/shared-ux-storybook';
import { mockServicesFactory, MockServicesFactoryParams } from '@kbn/shared-ux-services';
import {
  getNoDataViewsPromptStoryArgTypes,
  getNoDataViewsPromptStorybookServices,
  getNoDataViewsPromptMockServices,
} from '@kbn/shared-ux-prompt-no-data-views';

// @ts-expect-error Pending updates to how Bazel can package storybook and jest mocks.
import { NoDataCardStorybookMocks } from '@kbn/shared-ux-card-no-data/target_node/storybook';
// @ts-expect-error Pending updates to how Bazel can package storybook and jest mocks.
import { getNoDataCardMockServices } from '@kbn/shared-ux-card-no-data/target_node/jest';

import { KibanaNoDataPageServices } from './services';

// TODO: clintandrewhall - this looks (and is) a bit complicated because the No Data View
// dependency has not been converted to its own package yet.  As with `AnalyticsNoDataPage`,
// this file will be significantly simplified when that happens.

/**
 * Parameters drawn from the Storybook arguments collection that customize a component story.
 */
export type StoryParams = Record<keyof ReturnType<typeof getStoryArgTypes>, any>;

/**
 * Returns Storybook-compatible service abstractions for the `KibanaNoDataPage` Provider.
 */
export const getStoryServices = (params: StoryParams) => {
  const { canCreateNewDataView, dataViewsDocLink, openDataViewEditor } =
    // @ts-expect-error This error is expected, because the type is not (yet) known.
    getNoDataViewsPromptStorybookServices(params);

  const { addBasePath, canAccessFleet } = NoDataCardStorybookMocks.getServices(params);

  // Workaround to leverage the services package.
  const { application, data, docLinks, editors, http, permissions, platform } =
    servicesFactory(params);

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

/**
 * Returns the Storybook arguments for `KibanaNoDataPage`, for its stories for and for
 * consuming component stories.
 */
export const getStoryArgTypes = () => ({
  solution: {
    control: 'text',
    defaultValue: 'Observability',
  },
  logo: {
    control: { type: 'radio' },
    options: ['logoElastic', 'logoKibana', 'logoCloud', undefined],
    defaultValue: undefined,
  },
  hasESData: {
    control: 'boolean',
    defaultValue: false,
  },
  hasUserDataView: {
    control: 'boolean',
    defaultValue: false,
  },
  ...getNoDataViewsPromptStoryArgTypes(),
  ...NoDataCardStorybookMocks.getServiceArgumentTypes(),
});

/**
 * Returns the Jest-compatible service abstractions for the `KibanaNoDataPage` Provider.
 */
export const getMockServices = (params?: MockServicesFactoryParams) => {
  const { canCreateNewDataView, dataViewsDocLink, openDataViewEditor } =
    getNoDataViewsPromptMockServices();

  const { addBasePath, canAccessFleet } = getNoDataCardMockServices();

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
