/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createStandaloneParsedRequestsProvider } from './standalone_console_parser';

// Create a provider factory for packaging environment
export const createPackagingParsedRequestsProvider = () => {
  return (model: any) => {
    if (!model) {
      // eslint-disable-next-line no-console
      console.warn('Monaco editor model is null, creating fallback provider');
      return {
        getRequests: () => Promise.resolve([]),
        getErrors: () => Promise.resolve([]),
      };
    }
    return createStandaloneParsedRequestsProvider(model);
  };
};
