import type { ApiKey } from "./tabs/api_keys_tab/views/success_form/types";

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
  createKey: (params: {name: string}) => Promise<{
    apiKey: ApiKey;
  }>;
  hasPermission: () => Promise<boolean>;
}
