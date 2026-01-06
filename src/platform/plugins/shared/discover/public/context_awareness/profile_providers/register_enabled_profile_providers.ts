/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BaseProfileProvider, BaseProfileService } from '../profile_service';
import type { DiscoverServices } from '../../build_services';

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
  services,
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
  services: DiscoverServices;
}) => {
  for (const provider of availableProviders) {
    const checkForExperimentalProfile =
      !provider.isExperimental || enabledExperimentalProfileIds.includes(provider.profileId);
    const checkForProductFeature =
      !provider.restrictedToProductFeature ||
      services.core.pricing.isFeatureAvailable(provider.restrictedToProductFeature);

    if (checkForExperimentalProfile && checkForProductFeature) {
      profileService.registerProvider(provider);
    }
  }
};
