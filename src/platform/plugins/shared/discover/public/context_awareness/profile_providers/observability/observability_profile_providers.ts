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
import { createObservabilityTracesSpanDocumentProfileProvider } from './traces_document_profile/span_document_profile';
import { createObservabilityTracesTransactionDocumentProfileProvider } from './traces_document_profile/transaction_document_profile';

export const createObservabilityDocumentProfileProviders = (
  providerServices: ProfileProviderServices
) => {
  return [
    createObservabilityLogDocumentProfileProvider(providerServices),
    createObservabilityTracesSpanDocumentProfileProvider(providerServices),
    createObservabilityTracesTransactionDocumentProfileProvider(providerServices),
  ];
};
