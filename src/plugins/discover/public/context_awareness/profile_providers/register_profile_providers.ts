/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  DataSourceProfileService,
  DocumentProfileService,
  RootProfileService,
} from '../profiles';
import type { BaseProfileProvider, BaseProfileService } from '../profile_service';
import { exampleDataSourceProfileProvider } from './example_data_source_profile';
import { exampleDocumentProfileProvider } from './example_document_profile';
import { exampleRootProfileProvider } from './example_root_pofile';
import { createLogsDataSourceProfileProviders } from './logs_data_source_profile';
import { createLogDocumentProfileProvider } from './log_document_profile';
import { createSecurityRootProfileProvider } from './security/security_root_profile';
import {
  createProfileProviderServices,
  ProfileProviderServices,
} from './profile_provider_services';
import type { DiscoverStartPlugins } from '../../types';

export const registerProfileProviders = async ({
  plugins,
  rootProfileService,
  dataSourceProfileService,
  documentProfileService,
  enabledExperimentalProfileIds,
}: {
  plugins: DiscoverStartPlugins;
  rootProfileService: RootProfileService;
  dataSourceProfileService: DataSourceProfileService;
  documentProfileService: DocumentProfileService;
  /**
   * List of experimental profile Ids which are enabled in kibana config.
   * */
  enabledExperimentalProfileIds: string[];
}) => {
  const providerServices = await createProfileProviderServices({
    logsDataAccessPlugin: plugins.logsDataAccess,
  });
  const rootProfileProviders = createRootProfileProviders(providerServices);
  const dataSourceProfileProviders = createDataSourceProfileProviders(providerServices);
  const documentProfileProviders = createDocumentProfileProviders(providerServices);

  registerEnabledProfileProviders({
    profileService: rootProfileService,
    providers: [...rootProfileProviders],
    enabledExperimentalProfileIds,
  });

  registerEnabledProfileProviders({
    profileService: dataSourceProfileService,
    providers: [...dataSourceProfileProviders],
    enabledExperimentalProfileIds,
  });

  registerEnabledProfileProviders({
    profileService: documentProfileService,
    providers: [...documentProfileProviders],
    enabledExperimentalProfileIds,
  });
};

export const registerEnabledProfileProviders = <
  TProvider extends BaseProfileProvider<{}>,
  TService extends BaseProfileService<TProvider, {}>
>({
  profileService,
  providers: availableProviders,
  enabledExperimentalProfileIds = [],
}: {
  profileService: TService;
  providers: TProvider[];
  /**
   * List of experimental profile Ids which are enabled in kibana config.
   * */
  enabledExperimentalProfileIds?: string[];
}) => {
  for (const provider of availableProviders) {
    const isProfileExperimental = provider.isExperimental ?? false;
    const isProfileEnabled =
      enabledExperimentalProfileIds.includes(provider.profileId) || !isProfileExperimental;
    if (isProfileEnabled) {
      profileService.registerProvider(provider);
    }
  }
};

const createRootProfileProviders = (_providerServices: ProfileProviderServices) => [
  exampleRootProfileProvider,
  createSecurityRootProfileProvider(_providerServices),
];

const createDataSourceProfileProviders = (providerServices: ProfileProviderServices) => [
  exampleDataSourceProfileProvider,
  ...createLogsDataSourceProfileProviders(providerServices),
];

const createDocumentProfileProviders = (providerServices: ProfileProviderServices) => [
  exampleDocumentProfileProvider,
  createLogDocumentProfileProvider(providerServices),
];
