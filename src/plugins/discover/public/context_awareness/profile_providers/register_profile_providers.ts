/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { uniq } from 'lodash';
import type {
  DataSourceProfileService,
  DocumentProfileService,
  RootProfileService,
} from '../profiles';
import type { BaseProfileProvider, BaseProfileService } from '../profile_service';
import { exampleDataSourceProfileProvider } from './example_data_source_profile';
import { exampleDocumentProfileProvider } from './example_document_profile';
import { exampleRootProfileProvider } from './example_root_pofile';
import { createLogsDataSourceProfileProvider } from './logs_data_source_profile';
import { createLogDocumentProfileProvider } from './log_document_profile';
import { createProfileProviderServices } from './profile_provider_services';

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
  const logsDataSourceProfileProvider = createLogsDataSourceProfileProvider(providerServices);
  const logsDocumentProfileProvider = createLogDocumentProfileProvider(providerServices);
  const rootProfileProviders = [exampleRootProfileProvider];
  const dataSourceProfileProviders = [
    exampleDataSourceProfileProvider,
    logsDataSourceProfileProvider,
  ];
  const documentProfileProviders = [exampleDocumentProfileProvider, logsDocumentProfileProvider];
  const enabledProfileIds = uniq([
    logsDataSourceProfileProvider.profileId,
    logsDocumentProfileProvider.profileId,
    ...experimentalProfileIds,
  ]);

  registerEnabledProfileProviders({
    profileService: rootProfileService,
    availableProviders: rootProfileProviders,
    enabledProfileIds,
  });

  registerEnabledProfileProviders({
    profileService: dataSourceProfileService,
    availableProviders: dataSourceProfileProviders,
    enabledProfileIds,
  });

  registerEnabledProfileProviders({
    profileService: documentProfileService,
    availableProviders: documentProfileProviders,
    enabledProfileIds,
  });
};

export const registerEnabledProfileProviders = <
  TProvider extends BaseProfileProvider<{}>,
  TService extends BaseProfileService<TProvider, {}>
>({
  profileService,
  availableProviders,
  enabledProfileIds,
}: {
  profileService: TService;
  availableProviders: TProvider[];
  enabledProfileIds: string[];
}) => {
  for (const profile of availableProviders) {
    if (enabledProfileIds.includes(profile.profileId)) {
      profileService.registerProvider(profile);
    }
  }
};
