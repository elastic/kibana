/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ProfileProviderServices } from '../profile_provider_services';
import { createObservabilityLogDocumentProfileProvider } from './log_document_profile';
import { createObservabilityGenericDocumentProfileProvider } from './observability_document_profile/document_profile';
import { createObservabilityTracesDocumentProfileProvider } from './traces_document_profile/document_profile';

export const createObservabilityDocumentProfileProviders = (
  providerServices: ProfileProviderServices
) => {
  return [
    createObservabilityLogDocumentProfileProvider(providerServices),
    createObservabilityTracesDocumentProfileProvider(providerServices),
    createObservabilityGenericDocumentProfileProvider(providerServices),
  ];
};
