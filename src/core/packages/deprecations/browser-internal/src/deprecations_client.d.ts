/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { DomainDeprecationDetails } from '@kbn/core-deprecations-common';
import type { ResolveDeprecationResponse } from '@kbn/core-deprecations-browser';
export interface DeprecationsClientDeps {
  http: Pick<HttpStart, 'fetch'>;
}
export declare class DeprecationsClient {
  private readonly http;
  constructor({ http }: DeprecationsClientDeps);
  private fetchDeprecations;
  getAllDeprecations: () => Promise<DomainDeprecationDetails[]>;
  getDeprecations: (domainId: string) => Promise<DomainDeprecationDetails[]>;
  isDeprecationResolvable: (details: DomainDeprecationDetails) => boolean;
  private getResolveFetchDetails;
  resolveDeprecation: (details: DomainDeprecationDetails) => Promise<ResolveDeprecationResponse>;
}
