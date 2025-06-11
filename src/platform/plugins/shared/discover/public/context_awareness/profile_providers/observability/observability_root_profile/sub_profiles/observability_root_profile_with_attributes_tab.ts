/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extendProfileProvider } from '../../../extend_profile_provider';
import { getDocViewer } from '../accessors/get_doc_viewer';
import type { ObservabilityRootProfileProvider } from '../types';

export const createObservabilityRootProfileProviderWithAttributesTab = (
  observabilityRootProfileProvider: ObservabilityRootProfileProvider
) =>
  extendProfileProvider(observabilityRootProfileProvider, {
    profileId: 'observability-root-profile-with-attributes-tab',
    isExperimental: true,
    profile: {
      getDocViewer,
    },
  });
