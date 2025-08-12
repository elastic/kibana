/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ApiKey } from './tabs/api_keys_tab/views/success_form/types';

export interface ConnectionDetailsOpts {
  links?: ConnectionDetailsOptsLinks;
  endpoints?: ConnectionDetailsOptsEndpoints;
  apiKeys?: ConnectionDetailsOptsApiKeys;
  navigateToUrl?: (url: string) => void;
}

export interface ConnectionDetailsOptsLinks {
  learnMore?: string;
}

export interface ConnectionDetailsOptsEndpoints {
  url?: string;
  id?: string;
}

export interface ConnectionDetailsOptsApiKeys {
  manageKeysLink?: string;
  createKey: (params: { name: string }) => Promise<{
    apiKey: ApiKey;
  }>;
  hasPermission: () => Promise<boolean>;
}
