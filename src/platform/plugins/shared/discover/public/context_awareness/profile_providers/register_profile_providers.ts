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
import { createExampleDataSourceProfileProvider } from './example/example_data_source_profile/profile';
import { createExampleDocumentProfileProvider } from './example/example_document_profile';
import {
  createExampleSolutionViewRootProfileProvider,
  createExampleRootProfileProvider,
} from './example/example_root_profile';
import { createObservabilityLogsDataSourceProfileProviders } from './observability/logs_data_source_profile';
import { createObservabilityLogDocumentProfileProvider } from './observability/log_document_profile';
import { createSecurityRootProfileProvider } from './security/security_root_profile';
import {
  createProfileProviderServices,
  ProfileProviderServices,
} from './profile_provider_services';
import type { DiscoverServices } from '../../build_services';
import { createObservabilityRootProfileProvider } from './observability/observability_root_profile';
import { createTracesDataSourceProfileProvider } from './observability/traces_data_source_profile';
import { createDeprecationLogsDataSourceProfileProvider } from './common/deprecation_logs';
import { createClassicNavRootProfileProvider } from './common/classic_nav_root_profile';

/**
 * Register profile providers for root, data source, and document contexts to the profile profile services
 * @param options Register profile provider options
 */
export const registerProfileProviders = async ({
  rootProfileService,
  dataSourceProfileService,
  documentProfileService,
  enabledExperimentalProfileIds,
  services,
}: {
  /**
   * Root profile service
   */
  rootProfileService: RootProfileService;
  /**
   * Data source profile service
   */
  dataSourceProfileService: DataSourceProfileService;
  /**
   * Document profile service
   */
  documentProfileService: DocumentProfileService;
  /**
   * Array of experimental profile IDs which are enabled in `kibana.yml`
   */
  enabledExperimentalProfileIds: string[];
  services: DiscoverServices;
}) => {
  const providerServices = await createProfileProviderServices(services);
  const rootProfileProviders = createRootProfileProviders(providerServices);
  const dataSourceProfileProviders = createDataSourceProfileProviders(providerServices);
  const documentProfileProviders = createDocumentProfileProviders(providerServices);

  registerEnabledProfileProviders({
    profileService: rootProfileService,
    providers: rootProfileProviders,
    enabledExperimentalProfileIds,
  });

  registerEnabledProfileProviders({
    profileService: dataSourceProfileService,
    providers: dataSourceProfileProviders,
    enabledExperimentalProfileIds,
  });

  registerEnabledProfileProviders({
    profileService: documentProfileService,
    providers: documentProfileProviders,
    enabledExperimentalProfileIds,
  });
};

/**
 * Register enabled profile providers to the provided profile service
 * @param options Register enabled profile providers options
 */
export const registerEnabledProfileProviders = <
  TProvider extends BaseProfileProvider<{}, {}>,
  TService extends BaseProfileService<TProvider>
>({
  profileService,
  providers: availableProviders,
  enabledExperimentalProfileIds = [],
}: {
  /**
   * Profile service to register providers
   */
  profileService: TService;
  /**
   * Array of available profile providers
   */
  providers: TProvider[];
  /**
   * Array of experimental profile IDs which are enabled in `kibana.yml`
   */
  enabledExperimentalProfileIds?: string[];
}) => {
  for (const provider of availableProviders) {
    if (!provider.isExperimental || enabledExperimentalProfileIds.includes(provider.profileId)) {
      profileService.registerProvider(provider);
    }
  }
};

/**
 * Creates the available root profile providers
 * @param providerServices The profile provider services
 * @returns An array of available root profile providers
 */
const createRootProfileProviders = (providerServices: ProfileProviderServices) => [
  createExampleRootProfileProvider(),
  createExampleSolutionViewRootProfileProvider(),
  createClassicNavRootProfileProvider(providerServices),
  createSecurityRootProfileProvider(providerServices),
  createObservabilityRootProfileProvider(providerServices),
];

/**
 * Creates the available data source profile providers
 * @param providerServices The profile provider services
 * @returns An array of available data source profile providers
 */
const createDataSourceProfileProviders = (providerServices: ProfileProviderServices) => [
  createExampleDataSourceProfileProvider(),
  createDeprecationLogsDataSourceProfileProvider(),
  createTracesDataSourceProfileProvider(),
  ...createObservabilityLogsDataSourceProfileProviders(providerServices),
];

/**
 * Creates the available document profile providers
 * @param providerServices The profile provider services
 * @returns An array of available document profile providers
 */
const createDocumentProfileProviders = (providerServices: ProfileProviderServices) => [
  createExampleDocumentProfileProvider(),
  createObservabilityLogDocumentProfileProvider(providerServices),
];
