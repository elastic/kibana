/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ProfileProviderServices } from '../../profile_provider_services';
import { createObservabilityRootProfileProvider } from './profile';
import { createObservabilityRootProfileProviderWithAttributesTab } from './sub_profiles/observability_root_profile_with_attributes_tab';

export const createObservabilityRootProfileProviders = (
  providerServices: ProfileProviderServices
) => {
  const observabilityRootProfileProvider = createObservabilityRootProfileProvider(providerServices);

  return [
    createObservabilityRootProfileProviderWithAttributesTab(observabilityRootProfileProvider),
    observabilityRootProfileProvider,
  ];
};
