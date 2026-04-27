/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServerlessProjectType } from '@kbn/es';

/**
 * Serverless product tier.
 *
 * For project types that expose a tier today (security, oblt), this is derived
 * from the corresponding Kibana server args
 * (`--xpack.securitySolutionServerless.productTypes` for security,
 * `--pricing.tiers.products` for oblt). When no tier arg is present, the
 * implicit `complete` tier is returned.
 *
 * Resolves to `undefined` for stateful configs and for project types that
 * don't have a tier system today (e.g. `es`).
 */
export type ServerlessProductTier =
  | 'complete'
  | 'essentials'
  | 'logs_essentials'
  | 'search_ai_lake';

export interface ScoutTestConfig {
  serverless: boolean;
  http2: boolean;
  uiam: boolean;
  projectType?: ServerlessProjectType;
  productTier?: ServerlessProductTier;
  organizationId?: string;
  isCloud: boolean;
  cloudHostName?: string;
  cloudUsersFilePath: string;
  license: string;
  hosts: {
    kibana: string;
    elasticsearch: string;
  };
  auth: {
    username: string;
    password: string;
  };
  linkedProject?: {
    hosts: {
      elasticsearch: string;
    };
    auth: {
      username: string;
      password: string;
    };
  };
  metadata?: any;
}
