/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { uniq } from 'lodash';
import {
  githubSummaryDataSourceProfileProvider,
  githubSummaryDocumentProfileProvider,
} from './github_document_profile';
import {
  githubDocumentProfileProvider,
  githubDataSourceProfileProvider,
} from './github_document_profile/profile';
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
import {
  createProfileProviderServices,
  ProfileProviderServices,
} from './profile_provider_services';
import {
  githubApiSummaryDataSourceProfileProvider,
  githubApiSummaryDocumentProfileProvider,
} from './github_document_profile/profile_summary_api';

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
  const enabledProfileIds = uniq([
    githubDocumentProfileProvider.profileId,
    githubDataSourceProfileProvider.profileId,
    githubSummaryDocumentProfileProvider.profileId,
    githubSummaryDataSourceProfileProvider.profileId,
    githubApiSummaryDocumentProfileProvider.profileId,
    githubApiSummaryDataSourceProfileProvider.profileId,
    ...extractProfileIds(rootProfileProviders),
    ...extractProfileIds(dataSourceProfileProviders),
    ...extractProfileIds(documentProfileProviders),
    ...experimentalProfileIds,
  ]);

  registerEnabledProfileProviders({
    profileService: rootProfileService,
    availableProviders: [exampleRootProfileProvider, ...rootProfileProviders],
    enabledProfileIds,
  });

  registerEnabledProfileProviders({
    profileService: dataSourceProfileService,
    availableProviders: [
      exampleDataSourceProfileProvider,
      githubDataSourceProfileProvider,
      githubSummaryDataSourceProfileProvider,
      githubApiSummaryDataSourceProfileProvider,
      ...dataSourceProfileProviders,
    ],
    enabledProfileIds,
  });

  registerEnabledProfileProviders({
    profileService: documentProfileService,
    availableProviders: [
      githubDocumentProfileProvider,
      githubSummaryDocumentProfileProvider,
      githubApiSummaryDocumentProfileProvider,
      exampleDocumentProfileProvider,
      ...documentProfileProviders,
    ],
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
const extractProfileIds = (providers: Array<BaseProfileProvider<{}>>) =>
  providers.map(({ profileId }) => profileId);

const createRootProfileProviders = (_providerServices: ProfileProviderServices) =>
  [] as RootProfileProvider[];

const createDataSourceProfileProviders = (providerServices: ProfileProviderServices) => [
  ...createLogsDataSourceProfileProviders(providerServices),
];

const createDocumentProfileProviders = (providerServices: ProfileProviderServices) => [
  createLogDocumentProfileProvider(providerServices),
];
