/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  DataSourceProfileService,
  DocumentProfileService,
  RootProfileProvider,
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

export const registerProfileProviders = ({
  rootProfileService,
  dataSourceProfileService,
  documentProfileService,
  experimentalProfileIds,
}: {
  rootProfileService: RootProfileService;
  dataSourceProfileService: DataSourceProfileService;
  documentProfileService: DocumentProfileService;
  experimentalProfileIds: string[];
}) => {
  const providerServices = createProfileProviderServices();
  const rootProfileProviders = createRootProfileProviders(providerServices);
  const dataSourceProfileProviders = createDataSourceProfileProviders(providerServices);
  const documentProfileProviders = createDocumentProfileProviders(providerServices);

  const enabledRootProfileProviders = rootProfileProviders.filter(
    ({ isEnabled = true, profileId }) => isEnabled || experimentalProfileIds.includes(profileId)
  );

  const enabledDataSourceProfileProviders = dataSourceProfileProviders.filter(
    ({ isEnabled = true, profileId }) => isEnabled || experimentalProfileIds.includes(profileId)
  );

  const enabledDocumentProfileProviders = documentProfileProviders.filter(
    ({ isEnabled = true, profileId }) => isEnabled || experimentalProfileIds.includes(profileId)
  );

  registerProfileProvidersInternal({
    profileService: rootProfileService,
    providers: [...enabledRootProfileProviders],
  });

  registerProfileProvidersInternal({
    profileService: dataSourceProfileService,
    providers: [...enabledDataSourceProfileProviders],
  });

  registerProfileProvidersInternal({
    profileService: documentProfileService,
    providers: [...enabledDocumentProfileProviders],
  });
};

export const registerProfileProvidersInternal = <
  TProvider extends BaseProfileProvider<{}>,
  TService extends BaseProfileService<TProvider, {}>
>({
  profileService,
  providers: availableProviders,
}: {
  profileService: TService;
  providers: TProvider[];
}) => {
  for (const provider of availableProviders) {
    profileService.registerProvider(provider);
  }
};

const createRootProfileProviders = (_providerServices: ProfileProviderServices) =>
  [
    exampleRootProfileProvider,
    createSecurityRootProfileProvider(_providerServices),
  ] as RootProfileProvider[];

const createDataSourceProfileProviders = (providerServices: ProfileProviderServices) => [
  exampleDataSourceProfileProvider,
  ...createLogsDataSourceProfileProviders(providerServices),
];

const createDocumentProfileProviders = (providerServices: ProfileProviderServices) => [
  exampleDocumentProfileProvider,
  createLogDocumentProfileProvider(providerServices),
];
